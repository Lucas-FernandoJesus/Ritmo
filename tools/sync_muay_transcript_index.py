"""Sync the Muay Thai inventory and transcript folder index with manifest.json."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs/muay-thai"
FOLDER = DOCS / "transcricoes"
manifest = json.loads((FOLDER / "manifest.json").read_text(encoding="utf-8"))

inventory_path = DOCS / "inventario.md"
lines = inventory_path.read_text(encoding="utf-8").splitlines()
changed = 0
for index, line in enumerate(lines):
    if not line.startswith("| ") or "watch?v=" not in line:
        continue
    match = re.search(r"watch\?v=([A-Za-z0-9_-]{11})", line)
    if match and manifest[match.group(1)]["status"] == "caption_saved" and " | S | " in line:
        lines[index] = line.replace(" | S | ", " | V | ")
        changed += 1
if changed not in (0, 19):  # 17 videos, two repeated positions
    raise SystemExit(f"Unexpected number of newly verified positions: {changed}")
inventory_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

counts = {status: sum(item["status"] == status for item in manifest.values())
          for status in {item["status"] for item in manifest.values()}}
rows = [
    "# Transcrições de Muay Thai",
    "",
    "Coleta em 30/09/2026 dos 143 vídeos distintos do [inventário](../inventario.md). "
    "Os arquivos `.md` preservam a fala com marcações de tempo; os `.json3` são as legendas originais baixadas do YouTube. "
    "Legendas automáticas podem errar termos. Não constituem inspeção visual da técnica.",
    "",
    f"**Cobertura:** {counts.get('caption_saved', 0)} legendas salvas; "
    f"{counts.get('no_speech_detected', 0)} vídeos públicos sem legenda/fala aproveitável no ASR local; "
    f"{counts.get('unavailable', 0)} vídeos exclusivos de membros sem acesso.",
    "",
    "A skill `youtube-transcribe` foi avaliada: seu fluxo de ASR por API exige `ASR_API_KEY`, ausente neste ambiente. "
    "As legendas foram coletadas com `yt-dlp`; os quatro áudios públicos sem legenda foram testados com "
    "`faster-whisper base.en` local. Saídas espúrias do ASR foram descartadas.",
    "",
    "| Vídeo | Origem/status | Texto |",
    "|---|---|---|",
]
for video_id, item in manifest.items():
    title = item["title"].replace("|", "\\|")
    status = item["status"]
    label = {"caption_saved": "Legenda original", "no_speech_detected": "Sem fala utilizável", "unavailable": "Acesso de membro"}[status]
    link = f"[Abrir]({video_id}.md)" if status == "caption_saved" else "—"
    rows.append(f"| [{title}]({item['url']}) | {label} | {link} |")
(FOLDER / "README.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"newly verified positions={changed}; indexed={len(manifest)}; counts={counts}")
