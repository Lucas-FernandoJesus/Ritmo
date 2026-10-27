---
name: youtube-transcript-skill
description: Mirar un vídeo de verdad — de YouTube o un fichero local — como fotogramas, audio y transcripción con marcas de tiempo. Úsala cuando se pida «mira este vídeo», «transcribe esto», «qué dice este vídeo», «resume este vídeo de YouTube», «saca los fotogramas», «analiza este reel», «de qué va esta clase», o cuando haya que verificar algo que solo se ve en imagen (una pantalla, un rótulo, un corte de edición). Cubre YouTube, Vimeo, TikTok, Instagram y cualquier fuente que soporte yt-dlp, además de ficheros `.mp4`, `.mov`, `.mkv`, `.wav` y `.mp3`. Incluye qué hacer cuando YouTube corta con HTTP 429 y cómo sacar fotogramas sin descargar el vídeo. Transcribe en local con Whisper, sin enviar el audio a ningún sitio.
---

# youtube-transcript-skill — mirar un vídeo, no adivinarlo

> **La regla de la que cuelga todo:** un vídeo no está mirado hasta que has **leído la
> transcripción Y visto los fotogramas**. Ni la transcripción sola, ni el resumen que te dé
> otra herramienta. Lo que pasa en pantalla y no se dice en voz alta —un rótulo, una cifra, un
> corte— no está en el texto, y es casi siempre lo que te han pedido mirar.

---

## 1. El camino corto

```bash
python scripts/ver_video.py "https://www.youtube.com/watch?v=..." --salida ./visto
python scripts/ver_video.py ./clase.mp4 --salida ./visto --fotogramas 40
```

Deja una carpeta con `transcripcion.txt` (con marcas de tiempo), `fotogramas/` y `video.json`.
**Después hay que abrir las imágenes una a una.** El script las deja; mirarlas es tu trabajo.

---

## 2. La transcripción: tres caminos, en este orden

Se prueba uno y solo si falla se pasa al siguiente. **El orden importa y no es estético:** el
primero es instantáneo y gratis, el último cuesta minutos de CPU.

| | Camino | Cuándo funciona | Coste |
|---|---|---|---|
| **1** | **Los subtítulos que el vídeo ya tiene** (`yt-dlp --write-auto-sub --sub-format json3`) | Casi siempre… hasta que YouTube corta | instantáneo |
| **2** | **Whisper en local** (`faster-whisper`) | **Siempre.** También sin internet, también con un fichero tuyo | minutos de CPU |
| **3** | Un servicio que lea la página (p. ej. `exa.web_fetch_exa` sobre la URL) | Cuando no hay Whisper y YouTube corta | una llamada |

### ⚠️ El 429, que es la razón de que exista esta lista

`yt-dlp --write-auto-sub` devuelve **`HTTP Error 429: Too Many Requests`** con mucha frecuencia,
y cuando pasa **no hay reintento que valga**: hay que cambiar de camino, no insistir.

```
[info] Writing video subtitles to: sub-XXXX.en.json3
ERROR: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests
```

Medido el 19/10/2026: los **metadatos** del mismo vídeo (`--dump-json`) seguían funcionando y el
**guion gráfico** también. Es decir: **429 en los subtítulos no significa que YouTube te haya
bloqueado entero.** No abandones la tarea por un 429 en un solo endpoint.

### Whisper en local

```bash
pip install faster-whisper          # no hace falta ffmpeg-python ni torch
```

Los modelos se bajan solos la primera vez y se quedan en caché (`~/.cache/huggingface/hub`).

| Modelo | Para qué |
|---|---|
| `tiny`, `base` | saber de qué va, nombres propios mal |
| **`small`** | **el equilibrio. El valor por defecto aquí** |
| `medium` | audio difícil, varios hablantes |
| `large-v3` | cuando una palabra concreta tiene que estar bien |

**Velocidad medida** (19/10/2026, CPU sin GPU, `small` con `compute_type="int8"`): cargar el
modelo **3,4 s**, y **20 s de audio en 9,4 s** — o sea, unas **2 veces más rápido que el tiempo
real**. Un vídeo de 12 minutos son ~6 minutos de CPU. Dilo antes de empezar si alguien espera.

Comprueba si hay GPU antes de prometer velocidad:
```bash
python -c "import ctranslate2; print(ctranslate2.get_cuda_device_count(), 'GPU')"
```

---

## 3. Los fotogramas

### De YouTube, SIN descargar el vídeo: el guion gráfico

YouTube ya tiene hechas unas rejillas de miniaturas para la previsualización de la barra. Se bajan
con `-f sb0` y **pesan un suspiro**.

```bash
yt-dlp --no-warnings -f sb0 -o "guion.mhtml" "URL"
```

Medido sobre un vídeo de **12:01**: **17 rejillas de 960×540**, cada una con **9 fotogramas de
320×180** → **153 fotogramas, 597 KB en total**. Un fotograma cada ~4,7 s. Para entender la
estructura de un vídeo eso sobra, y evita descargar cientos de MB (y el 403 que a veces devuelve
la descarga del vídeo).

Hay cuatro calidades: `sb0` (320×180, la buena), `sb1` (160×90), `sb2` (80×45), `sb3` (48×27).

> ### ⚠️ La trampa del `.mhtml`: es BINARIO
>
> Un `.mhtml` abierto **como texto** (`email.message_from_file`) convierte los bytes del JPEG a
> `str` y **los ficheros salen corruptos**: empiezan por `\uff` literal en vez de `FF D8`, y
> `ffprobe` dice `No JPEG data found`. Hay que usar el **parser binario** y comprobar la firma:
>
> ```python
> from email.parser import BytesParser
> with open("guion.mhtml", "rb") as fh:          # "rb", no "r"
>     msg = BytesParser().parse(fh)
> for parte in msg.walk():
>     if parte.get_content_type().startswith("image/"):
>         d = parte.get_payload(decode=True)
>         if d and d[:2] == b"\xff\xd8":         # y se COMPRUEBA que es JPEG
>             ...
> ```
>
> Pasó al escribir esta skill. Las imágenes «se extrajeron» sin un solo error y ninguna servía.

### De un fichero: repartidos por la duración

```bash
ffmpeg -i video.mp4 -vf "fps=1/5,scale=640:-1" -q:v 4 f-%03d.jpg    # uno cada 5 s
```

### Los cortes de edición: NUNCA con un umbral de la cabeza

Para contar cortes o encontrar los cambios de plano, `-vf "select='gt(scene,0.30)'"` **miente** en
un plano fijo: un *jump cut* sobre el mismo fondo mueve poquísimos píxeles y puntúa 0,15–0,30, por
debajo del umbral. Medido en un vídeo real: **mediana 0,0029 · p95 0,034 · p99 0,13**, y los
cortes de verdad estaban en **0,13–0,31**. Con 0,30 se contaron **1** corte donde había **14**.

**El umbral sale de los datos, no de la cabeza:**

```bash
ffmpeg -i video.mp4 -vf "select='gt(scene,0)',metadata=print:file=scores.txt" -an -f null -
# y se mira la distribución antes de elegir nada
```

O, mejor, la herramienta pensada para esto:

```bash
pipx install "scenedetect[opencv]"
scenedetect -i video.mp4 detect-adaptive list-scenes -f -
```

`detect-adaptive` compara cada fotograma con una media móvil, que es exactamente lo que hace falta
para *jump cuts*.

---

## 4. Mirarlo de verdad

1. **Lee `transcripcion.txt` entera.** Las marcas de tiempo son para poder volver.
2. **Abre los fotogramas uno a uno.** Si son rejillas, cada una trae 9: míralas todas. Lo que
   buscas —una cifra en pantalla, un rótulo, un gesto— no está en el audio.
3. **Cruza las dos cosas.** «En el minuto 4 dice X» vale; «el vídeo trata de X» no.
4. **Di qué NO pudiste ver.** Si hubo 429 y no había Whisper, dilo. Un resumen inventado a partir
   del título y la descripción es peor que no responder.

---

## 5. Las trampas, todas medidas

| Trampa | Qué se ve | Qué hacer |
|---|---|---|
| **429 en los subtítulos** | `HTTP Error 429` | Cambiar de camino, no reintentar. Los metadatos y el guion gráfico suelen seguir vivos |
| **403 al bajar el vídeo** | `Unable to download video data` | Bajar **solo el audio** (`-f bestaudio`), o quedarse con el guion gráfico |
| **`.mhtml` leído como texto** | JPEGs que empiezan por `\uff` | `BytesParser` en binario + comprobar `FF D8` |
| **Consola de Windows (cp1252)** | `UnicodeEncodeError: 'charmap' codec can't encode character '→'` | `sys.stdout.reconfigure(encoding="utf-8", errors="replace")`, y **escribir la transcripción a fichero en UTF-8**, nunca fiarse de lo que se ve impreso |
| **Umbral de escena fijo** | «1 corte» donde hay 14 | Calibrar con la distribución, o `detect-adaptive` |
| **Subtítulos automáticos duplicados** | líneas repetidas al solaparse | Quedarse con el último texto de cada marca, o usar `json3` (ya viene limpio) |
| **Creerse la transcripción al pie de la letra** | nombres propios y cifras mal | Lo que importe, verlo en el fotograma |

---

## 6. Qué necesita

| | Para qué | Si falta |
|---|---|---|
| **yt-dlp** | bajar de YouTube y compañía | `pip install -U yt-dlp` — y actualízalo: YouTube cambia y las versiones viejas fallan |
| **ffmpeg** / **ffprobe** | audio y fotogramas | [ffmpeg.org](https://ffmpeg.org/download.html) |
| **faster-whisper** | transcribir en local | `pip install faster-whisper` *(opcional: sin él solo quedan los subtítulos)* |
| **scenedetect** | cortes de edición | `pipx install "scenedetect[opencv]"` *(opcional)* |

---

## 7. Lo que esta skill NO hace

- **No traduce.** Whisper puede, pero aquí se transcribe en el idioma original a propósito: la
  traducción se decide aparte y con el texto delante.
- **No separa hablantes** (*diarization*). Hace falta otra herramienta.
- **No descarga vídeos para redistribuirlos.** Baja lo mínimo para poder mirarlos, y lo temporal
  se borra al acabar. Respeta los términos de cada plataforma y los derechos de autor.
- **No resume solo.** Deja el material; el resumen lo haces tú habiendo mirado.
