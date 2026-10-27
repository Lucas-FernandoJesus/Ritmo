# Las trampas, con su evidencia

Cada una de estas pasó **al escribir esta skill**, el 19/10/2026, en una máquina Windows con
`yt-dlp 2026.07.04`, `ffmpeg 8.1.1`, Python 3.11.9 y `faster-whisper 1.2.1`. Están aquí con su
mensaje de error exacto para que se reconozcan de un vistazo, en vez de perder media hora
teorizando.

---

## 1. YouTube corta los subtítulos con 429 — pero no te ha bloqueado entero

```
[info] Writing video subtitles to: sub-Du2lkZ_cux8.en.json3
ERROR: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests
```

**Lo importante:** en la misma máquina, en el mismo minuto y sobre el mismo vídeo:

| Petición | Resultado |
|---|---|
| `yt-dlp --dump-json` (metadatos) | **funcionó** — título, duración, canal, fecha |
| `yt-dlp --write-auto-sub` (subtítulos) | **429** |
| `yt-dlp -f bestaudio` (audio) | **403 Forbidden** |
| `yt-dlp -f sb0` (guion gráfico) | **funcionó** — 17 rejillas |

Un 429 en un endpoint **no es motivo para abandonar la tarea**. Cambia de camino.

## 2. Las cookies del navegador no son la salida (al menos en Windows)

Es el consejo que se da siempre, y aquí no funcionó ninguno de los tres:

```
--cookies-from-browser chrome   → ERROR: Failed to decrypt with DPAPI
--cookies-from-browser edge     → ERROR: Could not copy Chrome cookie database
--cookies-from-browser firefox  → ERROR: could not find firefox cookies database
```

Chrome cifra las cookies con DPAPI y yt-dlp no siempre puede descifrarlas; Edge tiene la base
bloqueada mientras el navegador está abierto (ciérralo y vuelve a probar); Firefox no estaba
instalado. **Pruébalo, pero no cuentes con ello.**

## 3. El `.mhtml` del guion gráfico es BINARIO

El error no avisa: la extracción «funciona», no lanza ninguna excepción, y los ficheros no sirven.

```python
# MAL — email.message_from_file abre en modo texto
msg = email.message_from_file(open("guion.mhtml", encoding="utf-8", errors="replace"))
```

```
$ head -c 4 g00.jpg | xxd
00000000: 5c75 6666                                \uff
$ ffprobe g00.jpg
[mjpeg] No JPEG data found in image
width=0  height=0
```

Los bytes del JPEG se convirtieron a `str`: el fichero empieza por `\uff` **como texto** en vez de
por `FF D8`.

```python
# BIEN — parser binario, y se comprueba la firma antes de guardar
from email.parser import BytesParser
with open("guion.mhtml", "rb") as fh:
    msg = BytesParser().parse(fh)
for parte in msg.walk():
    if parte.get_content_type().startswith("image/"):
        d = parte.get_payload(decode=True)
        if d and d[:2] == b"\xff\xd8":
            ...
```

Con el parser binario: **17 rejillas válidas de 960×540, 597 KB en total**.

## 4. La consola de Windows mata el proceso por una flecha

```
File "...\encodings\cp1252.py", line 19, in encode
UnicodeEncodeError: 'charmap' codec can't encode character '→' in position 49
```

El proceso **muere** justo después de haber transcrito, y se pierde el trabajo. Dos reglas:

1. `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` al arrancar.
2. **La transcripción se escribe a fichero en UTF-8**, siempre. Lo que se imprime en pantalla no
   es la fuente de verdad: en esa misma consola, «solías» se ve como `sol�as` aunque el fichero
   esté perfecto.

## 5. El umbral de detección de cortes no se elige de memoria

`-vf "select='gt(scene,0.30)'"` sobre un plano fijo: **contó 1 corte donde había 14**. Un *jump
cut* con el mismo fondo, la misma persona y la misma luz mueve poquísimos píxeles.

Distribución real de `scene_score` en ese vídeo: **mediana 0,0029 · p95 0,034 · p99 0,13**. Los
cortes de verdad estaban entre **0,13 y 0,31** — o sea, por debajo del umbral «estándar».

```bash
# volcar TODOS los scores y mirar la distribución antes de elegir
ffmpeg -i video.mp4 -vf "select='gt(scene,0)',metadata=print:file=scores.txt" -an -f null -
```

O usar la herramienta pensada para esto, que compara contra una media móvil:

```bash
scenedetect -i video.mp4 detect-adaptive list-scenes -f -
```

## 6. Whisper: lo que cuesta de verdad

Medido con `faster-whisper 1.2.1`, modelo `small`, `compute_type="int8"`, **CPU sin GPU**
(`ctranslate2.get_cuda_device_count()` → `0`):

| | |
|---|---|
| Cargar el modelo | **3,4 s** |
| Transcribir 20 s de audio | **9,4 s** |
| Ritmo | **~2× el tiempo real** |
| Un vídeo de 12 min | **~6 min de CPU** |

Detección de idioma: español con probabilidad **0,99** en audio normal. Los modelos se quedan
cacheados en `~/.cache/huggingface/hub`, así que la primera vez tarda más por la descarga.

**Dilo antes de empezar** si alguien está esperando la respuesta.
