#!/usr/bin/env python3
"""
Fetches exercises from wger.de free API (897 exercises, CC license).
Normalizes to GymApp format and saves to public/data/exercises.json
Also merges with existing Kaggle exercises (which have GIFs).
"""

import json
import re
import time
import urllib.request
from pathlib import Path
from html.parser import HTMLParser

BASE = "https://wger.de/api/v2"
OUT_DIR = Path(__file__).parent.parent / "public" / "data"
KAGGLE_ZIP = Path(__file__).parent.parent / "archive.zip"

# ID → name mappings
MUSCLES = {
    1: "biceps", 2: "shoulders", 3: "serratus anterior", 4: "chest",
    5: "triceps", 6: "abs", 7: "calves", 8: "glutes", 9: "traps",
    10: "quads", 11: "hamstrings", 12: "lats", 13: "lower back",
    14: "obliques", 15: "soleus",
}
EQUIPMENT = {
    1: "barbell", 2: "ez bar", 3: "dumbbell", 4: "gym mat",
    5: "stability ball", 6: "pull-up bar", 7: "body weight",
    8: "bench", 9: "incline bench", 10: "kettlebell", 11: "resistance band",
}
CATEGORY = {
    10: "waist", 8: "upper arms", 12: "back", 14: "lower legs",
    15: "cardio", 11: "chest", 9: "upper legs", 13: "shoulders",
}


class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, d):
        self.text.append(d)
    def get_text(self):
        return " ".join(self.text).strip()


def strip_html(html: str) -> str:
    parser = HTMLStripper()
    parser.feed(html or "")
    return parser.get_text()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "GymApp/1.0 (personal use)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def fetch_all_exercises() -> list[dict]:
    """Fetch all exercises with English translations from wger API."""
    exercises = []
    url = f"{BASE}/exerciseinfo/?format=json&language=2&limit=100&offset=0"
    page = 0
    while url:
        page += 1
        print(f"  Fetching page {page}…", end=" ", flush=True)
        try:
            data = fetch_json(url)
        except Exception as e:
            print(f"ERROR: {e}")
            break
        
        for ex in data["results"]:
            # Find English translation
            eng = next(
                (t for t in ex.get("translations", []) if t.get("language") == 2 and t.get("name")),
                None
            )
            if not eng:
                continue  # Skip if no English name

            name = eng["name"].strip()
            description = strip_html(eng.get("description", ""))
            
            # Normalize muscles
            target = [MUSCLES[m["id"]] for m in ex.get("muscles", []) if m["id"] in MUSCLES]
            secondary = [MUSCLES[m["id"]] for m in ex.get("muscles_secondary", []) if m["id"] in MUSCLES]
            
            # Equipment
            equip_ids = [e["id"] for e in ex.get("equipment", [])]
            equipments = [EQUIPMENT[eid] for eid in equip_ids if eid in EQUIPMENT]
            if not equipments:
                equipments = ["body weight"]
            
            # Body parts from category
            cat_id = ex.get("category", {}).get("id")
            body_parts = [CATEGORY.get(cat_id, "full body")] if cat_id else ["full body"]
            
            # Images
            images = ex.get("images", [])
            gif_url = images[0]["image"] if images else None
            
            # Build instructions from description
            instructions = []
            if description:
                # Try to split into sentences
                sentences = [s.strip() for s in re.split(r"(?<=[.!])\s+", description) if s.strip()]
                instructions = [f"Step:{i+1} {s}" for i, s in enumerate(sentences)]

            exercises.append({
                "id": f"wger-{ex['id']}",
                "name": name,
                "slug": slugify(name),
                "source": "wger",
                "targetMuscles": target,
                "secondaryMuscles": secondary,
                "bodyParts": body_parts,
                "equipments": equipments,
                "mediaType": "gif" if gif_url else "none",
                "gifUrl": gif_url,
                "videoUrls": {},
                "instructions": instructions,
                "wgerUrl": f"https://wger.de/en/exercise/{ex['id']}/view",
            })

        print(f"{len(exercises)} total")
        url = data.get("next")
        if url:
            time.sleep(0.3)  # Be polite

    return exercises


def load_kaggle_exercises() -> list[dict]:
    """Load exercises from Kaggle archive if available."""
    import zipfile
    if not KAGGLE_ZIP.exists():
        return []
    try:
        with zipfile.ZipFile(KAGGLE_ZIP) as z:
            with z.open("exercisedb_v1_sample/exercises.json") as f:
                raw = json.loads(f.read())
        
        exercises = []
        for ex in raw:
            name = ex["name"].strip()
            gif_filename = ex.get("gifUrl", "")
            # Check if GIF already extracted to public/data/gifs/
            gif_path = OUT_DIR / "gifs" / gif_filename
            gif_url = f"/data/gifs/{gif_filename}" if gif_path.exists() else None
            
            instructions = []
            for step in ex.get("instructions", []):
                # Normalize "Step:N text" format
                instructions.append(step if step.startswith("Step:") else f"Step:1 {step}")
            
            exercises.append({
                "id": f"kaggle-{ex['exerciseId']}",
                "name": name,
                "slug": slugify(name),
                "source": "kaggle",
                "targetMuscles": [m.lower() for m in ex.get("targetMuscles", [])],
                "secondaryMuscles": [m.lower() for m in ex.get("secondaryMuscles", [])],
                "bodyParts": [bp.lower() for bp in ex.get("bodyParts", [])],
                "equipments": [e.lower() for e in ex.get("equipments", [])],
                "mediaType": "gif" if gif_url else "none",
                "gifUrl": gif_url,
                "videoUrls": {},
                "instructions": instructions,
            })
        print(f"  Loaded {len(exercises)} exercises from Kaggle archive")
        return exercises
    except Exception as e:
        print(f"  Could not load Kaggle data: {e}")
        return []


def merge(wger: list[dict], kaggle: list[dict]) -> list[dict]:
    """Merge datasets; kaggle GIFs take priority for same exercise name."""
    all_exercises = {}
    
    # Start with wger (primary)
    for ex in wger:
        all_exercises[ex["slug"]] = ex
    
    # Add/enrich with Kaggle data
    for ex in kaggle:
        slug = ex["slug"]
        if slug in all_exercises:
            # If wger has no GIF but kaggle does, add the GIF
            existing = all_exercises[slug]
            if existing["mediaType"] == "none" and ex["mediaType"] == "gif":
                existing["gifUrl"] = ex["gifUrl"]
                existing["mediaType"] = "gif"
        else:
            # New exercise from kaggle
            all_exercises[slug] = ex
    
    result = sorted(all_exercises.values(), key=lambda x: x["name"].lower())
    return result


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=== Fetching from wger.de API ===")
    wger_exercises = fetch_all_exercises()
    print(f"\n✓ Got {len(wger_exercises)} exercises from wger.de")
    
    # Save raw wger data
    raw_path = Path(__file__).parent / "data" / "wger_raw.json"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(json.dumps(wger_exercises, indent=2, ensure_ascii=False))
    
    print("\n=== Loading Kaggle exercises ===")
    kaggle_exercises = load_kaggle_exercises()
    
    print("\n=== Merging datasets ===")
    merged = merge(wger_exercises, kaggle_exercises)
    
    # Remove duplicates by slug (keep first occurrence)
    seen_slugs = {}
    deduped = []
    for ex in merged:
        slug = ex["slug"]
        if slug not in seen_slugs:
            seen_slugs[slug] = True
            deduped.append(ex)
        else:
            # Merge GIF if available
            existing = next(e for e in deduped if e["slug"] == slug)
            if existing["mediaType"] == "none" and ex["mediaType"] == "gif":
                existing["gifUrl"] = ex["gifUrl"]
                existing["mediaType"] = "gif"
    
    out_path = OUT_DIR / "exercises.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))
    print(f"\n✅ Saved {len(deduped)} exercises to {out_path}")
    
    # Summary
    with_media = sum(1 for e in deduped if e["mediaType"] != "none")
    print(f"   With media: {with_media}")
    print(f"   Text only:  {len(deduped) - with_media}")


if __name__ == "__main__":
    main()
