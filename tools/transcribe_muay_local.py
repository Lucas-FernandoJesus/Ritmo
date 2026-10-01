"""Local ASR fallback for public Muay Thai videos without YouTube captions.

Requires faster-whisper on PYTHONPATH and downloaded audio in the transcript
folder's _audio directory. Usage: python tools/transcribe_muay_local.py
"""

import json
from datetime import date
from pathlib import Path

import av
from faster_whisper import WhisperModel

# PyAV 19 removed the metadata_errors parameter still passed by faster-whisper
# 1.2.1. The default decoder behavior is sufficient for these downloaded files.
_av_open = av.open


def _compatible_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _av_open(*args, **kwargs)


av.open = _compatible_open

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs/muay-thai/transcricoes"
IDS = ("SSMu3x3-ejI", "JPsbtvEWKmc", "FJ2NM1XFluE", "CWJ3zhdaI6A")


def main():
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    path = DEST / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for video_id in IDS:
        audio = next((DEST / "_audio").glob(f"{video_id}.*"), None)
        if audio is None:
            print(f"{video_id} missing audio", flush=True)
            continue
        segments, info = model.transcribe(str(audio), language="en", beam_size=5,
                                            vad_filter=True, condition_on_previous_text=False)
        lines = []
        for segment in segments:
            speech = segment.text.strip()
            if speech:
                seconds = int(segment.start)
                lines.append(f"[{seconds // 60:02d}:{seconds % 60:02d}] {speech}")
        item = manifest[video_id]
        if lines:
            text = (f"# {item['title']}\n\nVídeo: {item['url']}\n"
                    f"Fonte: áudio do YouTube transcrito localmente por faster-whisper base.en; "
                    f"pode conter erros de reconhecimento.\nColeta: {date.today().isoformat()}\n\n"
                    + "\n".join(lines) + "\n")
            (DEST / f"{video_id}.md").write_text(text, encoding="utf-8")
            item["status"] = "asr_saved"
            item["source"] = "faster-whisper/base.en"
            item.pop("error", None)
        else:
            item["status"] = "no_speech_detected"
            item["source"] = "faster-whisper/base.en"
            (DEST / f"{video_id}.md").unlink(missing_ok=True)
        print(f"{video_id} {item['status']} {len(lines)} segments", flush=True)
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
