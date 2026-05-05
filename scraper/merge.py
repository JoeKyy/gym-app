#!/usr/bin/env python3
"""
Merge & normalize data from:
  - scraper/data/musclewiki_raw.json
  - scraper/data/exrx_raw.json
  - exercisedb_v1_sample/exercises.json (from archive.zip)

Outputs: public/data/exercises.json (unified schema)
"""

import json
import re
import zipfile
from pathlib import Path

SCRAPER_DIR = Path(__file__).parent
PROJECT_ROOT = SCRAPER_DIR.parent
DATA_DIR = SCRAPER_DIR / "data"
OUTPUT_FILE = PROJECT_ROOT / "public" / "data" / "exercises.json"
ARCHIVE_ZIP = PROJECT_ROOT / "archive.zip"

MUSCLEWIKI_RAW = DATA_DIR / "musclewiki_raw.json"
EXRX_RAW = DATA_DIR / "exrx_raw.json"


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def normalize_musclewiki(exercises: list[dict]) -> list[dict]:
    result = []
    for ex in exercises:
        name = ex.get("name", "").strip()
        if not name:
            continue

        video_urls = ex.get("videoUrls", {})
        has_video = bool(video_urls)
        gif_url = ex.get("gifUrl")

        result.append({
            "id": slugify(name),
            "name": name,
            "slug": slugify(name),
            "source": "musclewiki",
            "category": ex.get("category", ""),
            "difficulty": ex.get("difficulty"),
            "force": ex.get("force"),
            "mechanic": ex.get("mechanic"),
            "targetMuscles": ex.get("targetMuscles", []),
            "secondaryMuscles": ex.get("secondaryMuscles", []),
            "bodyParts": ex.get("bodyParts", []),
            "equipments": ex.get("equipments", []),
            "mediaType": "video" if has_video else ("gif" if gif_url else "none"),
            "videoUrls": video_urls if has_video else None,
            "gifUrl": gif_url,
            "instructions": {
                "steps": ex.get("steps", []),
                "tips": ex.get("tips"),
            },
            "musclewikiUrl": ex.get("musclewikiUrl"),
            "exrxUrl": None,
        })
    return result


def normalize_exrx(exercises: list[dict]) -> list[dict]:
    result = []
    for ex in exercises:
        name = ex.get("name", "").strip()
        if not name:
            continue
        muscles = ex.get("muscles", {})
        result.append({
            "id": slugify(name),
            "name": name,
            "slug": slugify(name),
            "source": "exrx",
            "category": ex.get("equipment", ""),
            "difficulty": None,
            "force": ex.get("force"),
            "mechanic": ex.get("mechanic"),
            "targetMuscles": muscles.get("target", []),
            "secondaryMuscles": muscles.get("secondary", []),
            "bodyParts": [],
            "equipments": [ex.get("equipment")] if ex.get("equipment") else [],
            "mediaType": "none",
            "videoUrls": None,
            "gifUrl": None,
            "instructions": {
                "steps": ex.get("steps", []),
                "tips": ex.get("tips"),
            },
            "musclewikiUrl": None,
            "exrxUrl": ex.get("exrxUrl"),
        })
    return result


def normalize_kaggle(exercises: list[dict]) -> list[dict]:
    result = []
    for ex in exercises:
        name = ex.get("name", "").strip()
        if not name:
            continue

        gif_file = ex.get("gifUrl", "")
        gif_path = f"/data/gifs/{gif_file}" if gif_file else None

        result.append({
            "id": slugify(name),
            "name": name,
            "slug": slugify(name),
            "source": "kaggle",
            "category": (ex.get("equipments") or [""])[0],
            "difficulty": None,
            "force": None,
            "mechanic": None,
            "targetMuscles": ex.get("targetMuscles", []),
            "secondaryMuscles": ex.get("secondaryMuscles", []),
            "bodyParts": ex.get("bodyParts", []),
            "equipments": ex.get("equipments", []),
            "mediaType": "gif" if gif_path else "none",
            "videoUrls": None,
            "gifUrl": gif_path,
            "instructions": {
                "steps": ex.get("instructions", []),
                "tips": None,
            },
            "musclewikiUrl": None,
            "exrxUrl": None,
        })
    return result


def merge(mw: list[dict], exrx: list[dict], kaggle: list[dict]) -> list[dict]:
    """
    Priority: MuscleWiki > ExRx > Kaggle.
    When same exercise appears in multiple sources, enrich MuscleWiki entry
    with ExRx instructions if its steps are empty.
    """
    # Build lookups by slug
    mw_map = {ex["slug"]: ex for ex in mw}
    exrx_map = {ex["slug"]: ex for ex in exrx}
    kaggle_map = {ex["slug"]: ex for ex in kaggle}

    all_slugs = set(mw_map) | set(exrx_map) | set(kaggle_map)
    result = []

    for slug in sorted(all_slugs):
        base = mw_map.get(slug) or exrx_map.get(slug) or kaggle_map.get(slug)
        if not base:
            continue

        entry = dict(base)

        # Enrich steps from ExRx if MuscleWiki has none
        if not entry["instructions"]["steps"] and slug in exrx_map:
            exrx_entry = exrx_map[slug]
            entry["instructions"]["steps"] = exrx_entry["instructions"]["steps"]
            entry["instructions"]["tips"] = exrx_entry["instructions"].get("tips")
            entry["exrxUrl"] = exrx_entry["exrxUrl"]

        # Enrich muscles from ExRx if empty
        if not entry["targetMuscles"] and slug in exrx_map:
            entry["targetMuscles"] = exrx_map[slug]["targetMuscles"]
            entry["secondaryMuscles"] = exrx_map[slug]["secondaryMuscles"]

        # Enrich GIF from Kaggle if no media
        if entry["mediaType"] == "none" and slug in kaggle_map:
            kaggle_entry = kaggle_map[slug]
            if kaggle_entry["gifUrl"]:
                entry["gifUrl"] = kaggle_entry["gifUrl"]
                entry["mediaType"] = "gif"

        # Ensure bodyParts from Kaggle if empty
        if not entry["bodyParts"] and slug in kaggle_map:
            entry["bodyParts"] = kaggle_map[slug]["bodyParts"]

        result.append(entry)

    return result


def extract_kaggle_gifs():
    """Extract GIFs from archive.zip to public/data/gifs/"""
    gif_dir = PROJECT_ROOT / "public" / "data" / "gifs"
    gif_dir.mkdir(parents=True, exist_ok=True)

    if not ARCHIVE_ZIP.exists():
        print("  archive.zip not found — skipping GIF extraction")
        return

    print("Extracting GIFs from archive.zip...")
    with zipfile.ZipFile(ARCHIVE_ZIP) as zf:
        extracted = 0
        for name in zf.namelist():
            if "gifs_180x180" in name and name.endswith(".gif"):
                filename = Path(name).name
                target = gif_dir / filename
                if not target.exists():
                    target.write_bytes(zf.read(name))
                    extracted += 1
        print(f"  Extracted {extracted} GIFs to {gif_dir}")


def main():
    (PROJECT_ROOT / "public" / "data").mkdir(parents=True, exist_ok=True)

    # Load sources
    mw_data = []
    if MUSCLEWIKI_RAW.exists():
        mw_data = json.loads(MUSCLEWIKI_RAW.read_text())
        print(f"MuscleWiki: {len(mw_data)} exercises")
    else:
        print("⚠ musclewiki_raw.json not found — run musclewiki.py first")

    exrx_data = []
    if EXRX_RAW.exists():
        exrx_data = json.loads(EXRX_RAW.read_text())
        print(f"ExRx: {len(exrx_data)} exercises")
    else:
        print("⚠ exrx_raw.json not found — run exrx.py first")

    kaggle_data = []
    if ARCHIVE_ZIP.exists():
        with zipfile.ZipFile(ARCHIVE_ZIP) as zf:
            with zf.open("exercisedb_v1_sample/exercises.json") as f:
                kaggle_data = json.load(f)
        print(f"Kaggle: {len(kaggle_data)} exercises")
    else:
        print("⚠ archive.zip not found — Kaggle data unavailable")

    # Extract Kaggle GIFs
    extract_kaggle_gifs()

    # Normalize
    mw = normalize_musclewiki(mw_data)
    exrx = normalize_exrx(exrx_data)
    kaggle = normalize_kaggle(kaggle_data)

    # Merge
    merged = merge(mw, exrx, kaggle)
    print(f"\nMerged total: {len(merged)} exercises")

    # Write output
    OUTPUT_FILE.write_text(json.dumps(merged, indent=2, ensure_ascii=False))
    print(f"✅ Saved to {OUTPUT_FILE}")

    # Stats
    has_video = sum(1 for e in merged if e["mediaType"] == "video")
    has_gif = sum(1 for e in merged if e["mediaType"] == "gif")
    has_steps = sum(1 for e in merged if e["instructions"]["steps"])
    print(f"\nStats:")
    print(f"  With video: {has_video}")
    print(f"  With GIF:   {has_gif}")
    print(f"  With steps: {has_steps}")


if __name__ == "__main__":
    main()
