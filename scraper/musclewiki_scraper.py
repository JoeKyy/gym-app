#!/usr/bin/env python3
"""
MuscleWiki Scraper — Playwright-based (Next.js App Router site)
Phase 1: Collects exercise slugs via equipment filters on /directory
Phase 2: Scrapes each exercise detail page extracting RSC + JSON-LD data
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "https://musclewiki.com"
OUT_FILE = Path(__file__).parent.parent / "public/data/exercises.json"
PROGRESS_FILE = Path("/tmp/mw_scrape_progress.json")

EQUIPMENT_FILTERS = [
    "Barbell", "Dumbbells", "Bodyweight", "Machine", "Medicine-Ball",
    "Kettlebells", "Stretches", "Cables", "Band", "Plate",
    "TRX", "Yoga", "Bosu-Ball", "Cardio", "Smith-Machine",
    "Recovery", "Pilates",
]


def extract_jsonld_name(content: str) -> str | None:
    """Extract exercise name from JSON-LD ExerciseAction."""
    scripts = re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        content, re.DOTALL
    )
    for s in scripts:
        try:
            d = json.loads(s)
            if d.get("@type") == "ExerciseAction":
                return d.get("name")
        except json.JSONDecodeError:
            continue
    return None


def extract_from_rsc(content: str) -> dict:
    """
    Extract exercise data from Next.js RSC payload.
    The RSC chunks use JSON-escaped strings with \\\" quoting.
    """
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', content, re.DOTALL)

    result = {}
    for c in chunks:
        if "muscles_primary" not in c:
            continue

        def find_list(key: str) -> list[str]:
            m = re.search(rf'\\"{key}\\":\[(.*?)\]', c, re.DOTALL)
            if not m:
                return []
            return re.findall(r'\\"name_en_us\\":\\"([^\\"]+)\\"', m.group(1))

        def find_obj_name(key: str) -> str | None:
            m = re.search(rf'\\"{key}\\":\{{[^\}}]*?\\"name_en_us\\":\\"([^\\"]+)\\"', c)
            return m.group(1) if m else None

        result["targetMuscles"] = find_list("muscles_primary")
        result["secondaryMuscles"] = find_list("muscles_secondary")
        result["tertiaryMuscles"] = find_list("muscles_tertiary")
        result["grips"] = find_list("grips")
        result["category"] = find_obj_name("category")
        result["difficulty"] = find_obj_name("difficulty")
        result["force"] = find_obj_name("force")
        result["mechanic"] = find_obj_name("mechanic")

        # Additional categories
        add_cats = re.search(r'\\"additional_categories\\":\[(.*?)\]', c, re.DOTALL)
        add_equip = []
        if add_cats:
            add_equip = re.findall(r'\\"name_en_us\\":\\"([^\\"]+)\\"', add_cats.group(1))
        result["additionalEquipments"] = add_equip

        # Videos — male section appears before female
        male_s = re.search(r'\\"male\\":\[(.*?)\](?=,\\"female\\")', c, re.DOTALL)
        female_s = re.search(r'\\"female\\":\[(.*?)\]', c, re.DOTALL)

        male_vids = []
        female_vids = []
        if male_s:
            male_vids = re.findall(r'\\"branded_video\\":\\"(https[^\\"]+\.mp4)\\"', male_s.group(1))
        if female_s:
            female_vids = re.findall(r'\\"branded_video\\":\\"(https[^\\"]+\.mp4)\\"', female_s.group(1))

        result["videoUrls"] = {
            "frontMale": male_vids[0] if len(male_vids) > 0 else None,
            "sideMale":  male_vids[1] if len(male_vids) > 1 else None,
            "frontFemale": female_vids[0] if len(female_vids) > 0 else None,
            "sideFemale":  female_vids[1] if len(female_vids) > 1 else None,
        }

        # OG / thumbnail images
        og_imgs = re.findall(r'\\"og_image\\":\\"(https[^\\"]+\.jpg)\\"', c)
        result["gifUrl"] = og_imgs[0] if og_imgs else None

        # Instructions: ordered steps from correct_steps array
        steps_s = re.search(r'\\"correct_steps\\":\[(.*?)\]', c, re.DOTALL)
        instructions = []
        if steps_s:
            instructions = re.findall(r'\\"text_en_us\\":\\"([^\\"]+)\\"', steps_s.group(1))
        result["instructions"] = instructions

        # SEO tags (interesting for search)
        seo_s = re.search(r'\\"seo_tags\\":\[(.*?)\]', c, re.DOTALL)
        seo_tags = []
        if seo_s:
            seo_tags = re.findall(r'\\"([^\\"]+)\\"', seo_s.group(1))
        result["tags"] = seo_tags

        break  # Only one chunk has muscles_primary

    return result


def build_exercise(slug: str, content: str) -> dict | None:
    """Combine JSON-LD + RSC data into unified exercise record."""
    name = extract_jsonld_name(content)
    if not name:
        name = slug.replace("-", " ").title()

    rsc = extract_from_rsc(content)
    if not rsc:
        return None  # Could not extract RSC data

    category = rsc.get("category", "")
    add_equip = rsc.get("additionalEquipments", [])
    all_equipments = list(dict.fromkeys([e for e in [category] + add_equip if e]))

    return {
        "id": slug,
        "name": name,
        "slug": slug,
        "source": "musclewiki",
        "category": category.lower() if category else None,
        "difficulty": (rsc.get("difficulty") or "").lower() or None,
        "force": (rsc.get("force") or "").lower() or None,
        "mechanic": (rsc.get("mechanic") or "").lower() or None,
        "grips": rsc.get("grips", []),
        "tags": rsc.get("tags", []),
        "targetMuscles": rsc.get("targetMuscles", []),
        "secondaryMuscles": rsc.get("secondaryMuscles", []),
        "tertiaryMuscles": rsc.get("tertiaryMuscles", []),
        "bodyParts": rsc.get("targetMuscles", []),
        "equipments": all_equipments,
        "mediaType": "video" if rsc.get("videoUrls", {}).get("frontMale") else "image",
        "videoUrls": rsc.get("videoUrls", {}),
        "gifUrl": rsc.get("gifUrl"),
        "instructions": rsc.get("instructions", []),
        "musclewikiUrl": f"{BASE_URL}/exercise/{slug}",
    }


async def collect_slugs(page) -> set[str]:
    """Collect exercise slugs from /directory using equipment filters."""
    all_slugs: set[str] = set()

    print("=== Phase 1: Collecting exercise slugs ===")

    for equipment in EQUIPMENT_FILTERS:
        print(f"  {equipment}...", end=" ", flush=True)
        try:
            await page.goto(f"{BASE_URL}/directory", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            # Click equipment filter label
            label = page.get_by_text(equipment, exact=True).first
            await label.click()
            await page.wait_for_timeout(3000)

            links = await page.evaluate("""
                () => Array.from(document.querySelectorAll('a[href*="/exercise/"]'))
                    .map(a => a.href)
            """)

            new_slugs: set[str] = set()
            for link in links:
                m = re.search(r'/exercise/([^?/]+)', link)
                if m:
                    new_slugs.add(m.group(1))

            print(f"{len(new_slugs)}", flush=True)
            all_slugs |= new_slugs

        except Exception as e:
            print(f"ERROR: {e}", flush=True)

    print(f"\n  Total unique slugs: {len(all_slugs)}\n")
    return all_slugs


async def scrape_exercise(page, slug: str) -> dict | None:
    """Load exercise page and extract data."""
    url = f"{BASE_URL}/exercise/{slug}?model=m"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(800)
        content = await page.content()
        return build_exercise(slug, content)
    except Exception as e:
        print(f"  ERR {slug}: {e}", file=sys.stderr)
        return None


async def main():
    # Load existing progress
    progress: dict = {}
    if PROGRESS_FILE.exists():
        try:
            progress = json.loads(PROGRESS_FILE.read_text())
            print(f"Resuming from progress file...")
        except Exception:
            pass

    # Load existing exercises.json (MuscleWiki only — wger data removed)
    existing_exercises: dict[str, dict] = {}

    if OUT_FILE.exists():
        try:
            all_ex = json.loads(OUT_FILE.read_text())
            for ex in all_ex:
                if ex.get("source") == "musclewiki":
                    existing_exercises[ex["slug"]] = ex
            print(f"Loaded {len(existing_exercises)} existing MuscleWiki exercises")
        except Exception:
            pass

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        # Phase 1: Collect slugs
        if "slugs" in progress:
            all_slugs = set(progress["slugs"])
            print(f"Using {len(all_slugs)} slugs from progress file")
        else:
            all_slugs = await collect_slugs(page)
            progress["slugs"] = list(all_slugs)
            PROGRESS_FILE.write_text(json.dumps(progress, indent=2))

        # Phase 2: Scrape each exercise
        to_scrape = [s for s in all_slugs if s not in existing_exercises]
        total = len(to_scrape)
        print(f"=== Phase 2: Scraping {total} exercises ===")
        print(f"  ({len(existing_exercises)} already done, {total} remaining)\n")

        scraped = dict(existing_exercises)  # copy

        for i, slug in enumerate(to_scrape, 1):
            exercise = await scrape_exercise(page, slug)
            if exercise:
                scraped[slug] = exercise
            else:
                print(f"  [{i}/{total}] SKIP: {slug}")

            # Save every 25 exercises
            if i % 25 == 0 or i == total:
                OUT_FILE.write_text(json.dumps(list(scraped.values()), indent=2, ensure_ascii=False))
                print(f"  [{i}/{total}] saved ({len(scraped)} MuscleWiki exercises)")

            # Small polite delay
            await asyncio.sleep(0.3)

        await browser.close()

    # Final save (MuscleWiki only)
    OUT_FILE.write_text(json.dumps(list(scraped.values()), indent=2, ensure_ascii=False))
    print(f"\n✓ Done! {len(scraped)} MuscleWiki exercises saved to {OUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
