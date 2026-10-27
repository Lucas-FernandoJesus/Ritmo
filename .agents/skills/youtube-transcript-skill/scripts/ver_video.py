#!/usr/bin/env python3
"""Deja un video listo para MIRARLO: transcripcion + fotogramas, en una carpeta.

    python scripts/ver_video.py "https://www.youtube.com/watch?v=..." --salida ./visto
    python scripts/ver_video.py ./clase.mp4 --salida ./visto --fotogramas 40

Lo que hace, en este orden, y POR QUE ese orden:

  TRANSCRIPCION — tres caminos, del mas barato al mas caro. Se prueba uno, y solo si falla
  se pasa al siguiente. Esto no es paranoia: `yt-dlp --write-auto-sub` devuelve **HTTP 429
  Too Many Requests** con frecuencia, y cuando pasa no hay reintento que valga.
    1. Subtitulos que YA existen en el video (instantaneo, sin transcribir nada).
    2. Whisper en local (faster-whisper): funciona siempre, tambien sin internet y con
       cualquier fichero. Cuesta tiempo de CPU.
    3. Si no hay ninguno de los dos, lo dice. No se inventa una transcripcion.

  FOTOGRAMAS — dos caminos:
    · De YouTube SIN bajar el video: el **guion grafico** (`-f sb0`), que son rejillas de
      fotogramas que YouTube ya tiene hechas. Pesa ~0,6 MB en vez de cientos, y no lo bloquea
      el 403 que a veces devuelve la descarga del video.
    · De un fichero local: ffmpeg, repartidos por toda la duracion.

Nada de esto escribe fuera de la carpeta de salida.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
from email.parser import BytesParser
from pathlib import Path

ES_URL = re.compile(r"^https?://", re.I)


def correr(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    """Ejecuta y devuelve el resultado sin reventar: cada llamada decide que hacer con el fallo."""
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", **kw)


def hay(programa: str) -> bool:
    return shutil.which(programa) is not None


# ── Metadatos ────────────────────────────────────────────────────────────────────────────────
def metadatos(fuente: str) -> dict:
    if ES_URL.match(fuente):
        r = correr(["yt-dlp", "--no-warnings", "--dump-json", "--skip-download", fuente])
        if r.returncode != 0:
            raise SystemExit(f"yt-dlp no pudo leer el video:\n{r.stderr.strip()[:400]}")
        d = json.loads(r.stdout)
        return {"titulo": d.get("title"), "duracion": d.get("duration"),
                "canal": d.get("uploader"), "id": d.get("id"), "fecha": d.get("upload_date")}
    p = Path(fuente)
    if not p.exists():
        raise SystemExit(f"No existe: {fuente}")
    r = correr(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=nw=1:nk=1", str(p)])
    dur = float(r.stdout.strip() or 0)
    return {"titulo": p.stem, "duracion": int(dur), "canal": None, "id": p.stem, "fecha": None}


# ── 1 · Transcripcion ────────────────────────────────────────────────────────────────────────
def subtitulos_que_ya_existen(fuente: str, destino: Path) -> str | None:
    """El camino barato. Devuelve el texto, o None si no hay / si YouTube corta con 429."""
    if not ES_URL.match(fuente):
        return None
    base = destino / "subs"
    r = correr(["yt-dlp", "--no-warnings", "--no-progress", "--write-auto-sub", "--write-sub",
                "--sub-format", "json3", "--skip-download", "-o", str(base), fuente])
    if "429" in (r.stderr or ""):
        print("   · YouTube contesto 429 (demasiadas peticiones) a los subtitulos.")
        return None
    ficheros = sorted(glob.glob(str(base) + "*.json3"))
    if not ficheros:
        return None
    datos = json.loads(Path(ficheros[0]).read_text(encoding="utf-8"))
    lineas = []
    for ev in datos.get("events", []):
        txt = "".join(s.get("utf8", "") for s in ev.get("segs", []) or []).strip()
        if txt:
            lineas.append((ev.get("tStartMs", 0) / 1000.0, txt))
    if not lineas:
        return None
    return "\n".join(f"[{int(t)//60:02d}:{int(t)%60:02d}] {x}" for t, x in lineas)


def audio_de(fuente: str, destino: Path) -> Path | None:
    """16 kHz mono, que es lo que quiere Whisper. Para una URL hay que bajar solo el audio."""
    wav = destino / "audio.wav"
    if ES_URL.match(fuente):
        m4a = destino / "audio_bruto.m4a"
        r = correr(["yt-dlp", "--no-warnings", "--no-progress", "-f", "bestaudio",
                    "-o", str(m4a), fuente])
        if r.returncode != 0 or not m4a.exists():
            print(f"   · no se pudo bajar el audio: {(r.stderr or '')[:200]}")
            return None
        origen = m4a
    else:
        origen = Path(fuente)
    r = correr(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(origen),
                "-vn", "-ac", "1", "-ar", "16000", "-y", str(wav)])
    return wav if wav.exists() else None


def whisper_local(wav: Path, modelo: str) -> str | None:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("   · faster-whisper no esta instalado.  pip install faster-whisper")
        return None
    print(f"   · transcribiendo con faster-whisper «{modelo}» (CPU, int8)…")
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, info = m.transcribe(str(wav), vad_filter=True)
    partes = []
    for s in segs:
        partes.append(f"[{int(s.start)//60:02d}:{int(s.start)%60:02d}] {s.text.strip()}")
    print(f"   · idioma: {info.language} ({info.language_probability:.2f}) · "
          f"{len(partes)} segmentos")
    return "\n".join(partes) if partes else None


# ── 2 · Fotogramas ───────────────────────────────────────────────────────────────────────────
def rejillas_de_youtube(fuente: str, destino: Path) -> int:
    """El guion grafico de YouTube: fotogramas sin bajar el video. ~0,6 MB para 12 minutos."""
    if not ES_URL.match(fuente):
        return 0
    mhtml = destino / "guion.mhtml"
    r = correr(["yt-dlp", "--no-warnings", "--no-progress", "-f", "sb0",
                "-o", str(mhtml), fuente])
    if not mhtml.exists():
        print(f"   · sin guion grafico: {(r.stderr or '')[:160]}")
        return 0
    # TRAMPA: el .mhtml es BINARIO. Abrirlo como texto (`message_from_file`) convierte los
    # bytes del JPEG a str y los ficheros salen corruptos — empiezan por "\uff" literal en vez
    # de FF D8. Hay que usar el parser binario, y comprobar la firma antes de guardar.
    carpeta = destino / "fotogramas"
    carpeta.mkdir(exist_ok=True)
    with open(mhtml, "rb") as fh:
        msg = BytesParser().parse(fh)
    n = 0
    for parte in msg.walk():
        if parte.get_content_type().startswith("image/"):
            d = parte.get_payload(decode=True)
            if d and d[:2] == b"\xff\xd8":          # es un JPEG de verdad
                (carpeta / f"rejilla-{n:02d}.jpg").write_bytes(d)
                n += 1
    mhtml.unlink(missing_ok=True)
    return n


def fotogramas_de_fichero(fuente: str, destino: Path, cuantos: int, duracion: int) -> int:
    carpeta = destino / "fotogramas"
    carpeta.mkdir(exist_ok=True)
    if duracion <= 0 or cuantos <= 0:
        return 0
    cada = max(1.0, duracion / cuantos)
    r = correr(["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(fuente),
                "-vf", f"fps=1/{cada},scale=640:-1", "-q:v", "4",
                str(carpeta / "f-%03d.jpg")])
    if r.returncode != 0:
        print(f"   · ffmpeg fallo: {(r.stderr or '')[:200]}")
    return len(list(carpeta.glob("f-*.jpg")))


def main() -> int:
    ap = argparse.ArgumentParser(description="Deja un video listo para mirarlo.")
    ap.add_argument("fuente", help="URL de YouTube (o de lo que yt-dlp soporte) o fichero local")
    ap.add_argument("--salida", default="./visto", help="carpeta donde dejarlo todo")
    ap.add_argument("--modelo", default="small",
                    help="modelo de Whisper: tiny, base, small, medium, large-v3 (por defecto: small)")
    ap.add_argument("--fotogramas", type=int, default=30,
                    help="cuantos sacar de un fichero local (por defecto: 30)")
    ap.add_argument("--sin-fotogramas", action="store_true")
    ap.add_argument("--solo-whisper", action="store_true",
                    help="saltarse los subtitulos existentes y transcribir siempre")
    args = ap.parse_args()

    # La consola de Windows es cp1252 y REVIENTA al imprimir una flecha o unas comillas
    # angulares: `UnicodeEncodeError: 'charmap' codec can't encode character '→'`.
    # Paso de verdad la primera vez que se corrio esto. Se arregla aqui, una vez, en vez de
    # escribir en ASCII por todo el fichero.
    for flujo in (sys.stdout, sys.stderr):
        try:
            flujo.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    for prog in ("yt-dlp", "ffmpeg"):
        if not hay(prog):
            raise SystemExit(f"Falta «{prog}» en el PATH. Sin eso esto no funciona.")

    destino = Path(args.salida)
    destino.mkdir(parents=True, exist_ok=True)

    print("· leyendo el video…")
    meta = metadatos(args.fuente)
    d = int(meta["duracion"] or 0)
    print(f"  «{meta['titulo']}» · {d // 60}:{d % 60:02d}"
          + (f" · {meta['canal']}" if meta["canal"] else ""))

    print("· transcripcion:")
    texto, via = None, None
    if not args.solo_whisper:
        texto = subtitulos_que_ya_existen(args.fuente, destino)
        if texto:
            via = "subtitulos del propio video"
    if not texto:
        wav = audio_de(args.fuente, destino)
        if wav:
            texto = whisper_local(wav, args.modelo)
            via = f"whisper local ({args.modelo})"
    if texto:
        # SIEMPRE a fichero y en UTF-8: la consola de Windows destroza los acentos al imprimir.
        (destino / "transcripcion.txt").write_text(texto, encoding="utf-8")
        print(f"  listo por {via} · {len(texto.split())} palabras → transcripcion.txt")
    else:
        print("  NO se pudo transcribir. No me invento el texto.")
        print("  Lo que queda por probar, en este orden:")
        if ES_URL.match(args.fuente):
            print("    1. Un servicio que lea la pagina del video en vez de descargarlo")
            print("       (p. ej. `exa.web_fetch_exa` o un lector tipo r.jina.ai sobre la URL).")
            print("    2. `yt-dlp --cookies-from-browser chrome|edge|firefox` — ojo: en Windows")
            print("       suele fallar con «Failed to decrypt with DPAPI» o con la base de")
            print("       cookies bloqueada por el navegador abierto. Cierra el navegador antes.")
            print("    3. Bajar el video a mano y volver a correr esto sobre el fichero.")
        else:
            print("    1. `pip install faster-whisper` si no estaba instalado.")
            print("    2. Comprobar que el fichero trae pista de audio: `ffprobe -i <fichero>`.")

    n = 0
    if not args.sin_fotogramas:
        print("· fotogramas:")
        n = rejillas_de_youtube(args.fuente, destino)
        if n:
            print(f"  {n} rejillas del guion grafico de YouTube (sin bajar el video)")
        else:
            n = fotogramas_de_fichero(args.fuente, destino, args.fotogramas, meta["duracion"] or 0)
            if n:
                print(f"  {n} fotogramas sacados con ffmpeg")
            else:
                print("  sin fotogramas")

    (destino / "video.json").write_text(
        json.dumps({**meta, "transcripcion_via": via, "imagenes": n}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    for resto in ("audio_bruto.m4a",):
        (destino / resto).unlink(missing_ok=True)   # lo temporal se deshace solo

    print(f"\nTodo en {destino.resolve()}")
    if n and texto:
        print("Ahora MIRALO: abre las imagenes de fotogramas/ UNA A UNA y lee transcripcion.txt.")
        print("Lo que sale escrito en pantalla y no se dice en voz alta solo esta en las imagenes.")
    elif n:
        print("Ahora MIRALO: abre las imagenes de fotogramas/ una a una. No hay transcripcion.")
    elif texto:
        print("Lee transcripcion.txt. Sin fotogramas no puedes afirmar nada de lo que se VE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
