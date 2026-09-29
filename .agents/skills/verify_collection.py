"""Verify the repository skill snapshots without third-party dependencies."""
from pathlib import Path
from urllib.parse import unquote
import hashlib
import json
import re
import sys

def verify():
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == 1, "Unsupported manifest version"
    names = set()
    count = 0
    for skill in manifest["skills"]:
        name = skill["name"]
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name), name
        assert name not in names, f"Duplicate skill: {name}"
        names.add(name)
        folder = (root / skill["path"]).resolve()
        assert folder == root / name and folder.is_dir(), f"Invalid skill folder: {name}"
        entrypoint = (root / skill["entrypoint"]).resolve()
        assert entrypoint == folder / "SKILL.md", f"Invalid entrypoint: {name}"
        content = entrypoint.read_text(encoding="utf-8")
        parts = content.split("---", 2)
        assert len(parts) == 3 and not parts[0], f"Missing frontmatter: {name}"
        title = re.search(r"^name:[ \t]*(.+)$", parts[1], re.M)
        description = re.search(r"^description:[ \t]*(.+)$", parts[1], re.M)
        assert title and title[1].strip().strip("\"'").casefold() == name, f"Invalid name: {name}"
        assert description and description[1].strip(), f"Missing description: {name}"
        recorded = set()
        for item in skill["files"]:
            relative = item["path"]
            path = (folder / relative).resolve()
            assert path.is_relative_to(folder) and path.is_file(), f"Missing resource: {name}/{relative}"
            assert relative not in recorded, f"Duplicate resource: {name}/{relative}"
            recorded.add(relative)
            data = path.read_bytes()
            assert len(data) == item["bytes"], f"Changed size: {name}/{relative}"
            assert hashlib.sha256(data).hexdigest() == item["sha256"], f"Changed hash: {name}/{relative}"
            count += 1
        actual = {path.relative_to(folder).as_posix() for path in folder.rglob("*")
                  if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc"}
        assert actual == recorded, f"Unrecorded resources in {name}: {actual ^ recorded}"
    assert {p.name for p in root.iterdir() if p.is_dir() and (p / "SKILL.md").exists()} == names
    links = 0
    for target in re.findall(r"\]\(([^)]+)\)", (root / "README.md").read_text(encoding="utf-8")):
        if re.match(r"[a-z][a-z0-9+.-]*:|#", target, re.I):
            continue
        path = root / unquote(target.split("#")[0])
        assert path.exists(), f"Broken index link: {target}"
        links += 1
    print(f"{len(names)} skills, {count} resource hashes and {links} index links verified.")

if __name__ == "__main__":
    try:
        verify()
    except (AssertionError, KeyError, ValueError, OSError) as error:
        print(f"Collection verification failed: {error}", file=sys.stderr)
        sys.exit(1)
