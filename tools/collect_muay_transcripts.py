"""Collect original YouTube captions for the Muay Thai research inventory.

Usage: python tools/collect_muay_transcripts.py PATH_TO_YT_DLP_EXE
The ASR-based youtube-transcribe workflow requires ASR_API_KEY; this fallback
preserves captions from the video itself and labels their provenance.
"""

import json
import re
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/muay-thai/inventario.md"
DEST = ROOT / "docs/muay-thai/transcricoes"
VIDEO = re.compile(r"\[(.+)\]\(https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})\)")


def inventory():
    found = {}
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        match = VIDEO.search(line)
        if match:
            title, video_id = match.groups()
            found.setdefault(video_id, {"id": video_id, "title": title.replace("\\|", "|"), "url": f"https://www.youtube.com/watch?v={video_id}", "positions": []})
            if line.startswith("|"):
                found[video_id]["positions"].append(line.split("|")[1].strip())
    return found


def convert(video_id, item):
    candidates = sorted(DEST.glob(f"{video_id}.*.json3"))
    if not candidates:
        return False
    source = candidates[0]
    data = json.loads(source.read_text(encoding="utf-8"))
    parts = []
    for event in data.get("events", []):
        fragment = "".join(segment.get("utf8", "") for segment in event.get("segs", [])).strip()
        if fragment:
            seconds = event.get("tStartMs", 0) // 1000
            parts.append(f"[{seconds // 60:02d}:{seconds % 60:02d}] {fragment}")
    if not parts:
        return False
    text = (f"# {item['title']}\n\n"
            f"Vídeo: {item['url']}\n"
            f"Fonte: legenda original do YouTube ({source.name}); pode conter erros automáticos.\n"
            f"Coleta: {date.today().isoformat()}\n\n"
            + "\n".join(parts) + "\n")
    (DEST / f"{video_id}.md").write_text(text, encoding="utf-8")
    return True


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    exe = Path(sys.argv[1])
    DEST.mkdir(parents=True, exist_ok=True)
    entries = inventory()
    manifest_path = DEST / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    for number, (video_id, item) in enumerate(entries.items(), 1):
        if convert(video_id, item):
            status = "caption_saved"
        else:
            command = [str(exe), "--skip-download", "--write-auto-subs", "--write-subs",
                       "--sub-langs", "en-orig", "--sub-format", "json3", "--no-playlist",
                       "--no-warnings", "--retries", "1", "-o", str(DEST / "%(id)s"), item["url"]]
            try:
                run = subprocess.run(command, capture_output=True, text=True, timeout=90)
                status = "caption_saved" if convert(video_id, item) else "unavailable"
                error = " ".join(run.stderr.split())[-400:]
            except subprocess.TimeoutExpired:
                status, error = "unavailable", "yt-dlp timeout after 90 seconds"
            if status == "unavailable":
                item["error"] = error
        item["status"] = status
        manifest[video_id] = item
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{number}/{len(entries)} {video_id} {status}", flush=True)
        if status == "unavailable" and "429" in item.get("error", ""):
            time.sleep(10)
        else:
            time.sleep(0.5)
    print(f"saved={sum(x['status'] == 'caption_saved' for x in manifest.values())} total={len(entries)}")


if __name__ == "__main__":
    main()
