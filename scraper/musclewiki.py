#!/usr/bin/env python3
"""
MuscleWiki scraper — collects exercise metadata + media URLs (no download).
Saves raw data to scraper/data/musclewiki_raw.json
"""

import asyncio
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright, Page

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "musclewiki_raw.json"
BASE_URL = "https://musclewiki.com"

# All muscle categories available on MuscleWiki
MUSCLE_SLUGS = [
    "abductors", "abs", "adductors", "biceps", "calves", "cardiovascular-system",
    "delts", "forearms", "glutes", "hamstrings", "hip-flexors", "it-band",
    "lats", "levator-scapulae", "lower-back", "neck", "obliques", "pecs",
    "quads", "rotator-cuff", "serratus-anterior", "soleus", "spine",
    "traps", "triceps", "upper-back",
]


async def scrape_exercise(page: Page, url: str) -> dict | None:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        exercise = {"musclewikiUrl": url, "videoUrls": {}, "steps": [], "tips": ""}

        # Name
        name_el = await page.query_selector("h1")
        if name_el:
            exercise["name"] = (await name_el.inner_text()).strip()

        # Videos — intercept network requests for .mp4
        videos_found = []
        async def handle_response(response):
            if ".mp4" in response.url:
                videos_found.append(response.url)
        page.on("response", handle_response)

        # Wait briefly for lazy-loaded videos
        await page.wait_for_timeout(2000)

        # Also try to find video elements in DOM
        video_els = await page.query_selector_all("video source, video")
        for el in video_els:
            src = await el.get_attribute("src") or await el.get_attribute("data-src")
            if src and ".mp4" in src:
                videos_found.append(src)

        # Categorize by URL patterns (front/side, male/female)
        for v in set(videos_found):
            if "front" in v and "female" in v:
                exercise["videoUrls"]["frontFemale"] = v
            elif "side" in v and "female" in v:
                exercise["videoUrls"]["sideFemale"] = v
            elif "front" in v:
                exercise["videoUrls"]["frontMale"] = v
            elif "side" in v:
                exercise["videoUrls"]["sideMale"] = v

        # GIF
        gif_els = await page.query_selector_all("img[src*='.gif'], img[data-src*='.gif']")
        for el in gif_els:
            src = await el.get_attribute("src") or await el.get_attribute("data-src")
            if src:
                exercise["gifUrl"] = src if src.startswith("http") else f"{BASE_URL}{src}"
                break

        # Target / secondary muscles
        exercise["targetMuscles"] = []
        exercise["secondaryMuscles"] = []
        muscle_sections = await page.query_selector_all("[class*='muscle'], [class*='target']")
        # Fallback: look for text labels in the sidebar/details
        muscle_labels = await page.query_selector_all("li, span")
        for el in muscle_labels:
            txt = (await el.inner_text()).strip().lower()
            if "primary" in txt or "target" in txt:
                parent = await el.evaluate_handle("el => el.nextElementSibling || el.parentElement")

        # Equipment / difficulty / force
        details_els = await page.query_selector_all("dd, [class*='detail'], [class*='badge']")
        for el in details_els:
            txt = (await el.inner_text()).strip()
            cls = await el.get_attribute("class") or ""
            if any(k in cls.lower() for k in ["equipment", "category"]):
                exercise.setdefault("equipments", []).append(txt)
            elif any(k in cls.lower() for k in ["difficulty", "level"]):
                exercise["difficulty"] = txt.lower()
            elif "force" in cls.lower():
                exercise["force"] = txt.lower()

        # Steps
        steps = []
        step_els = await page.query_selector_all("ol li, [class*='step']")
        for el in step_els:
            txt = (await el.inner_text()).strip()
            if txt:
                steps.append(txt)
        exercise["steps"] = steps

        # Tips
        tips_el = await page.query_selector("[class*='tip'], [class*='Tip']")
        if tips_el:
            exercise["tips"] = (await tips_el.inner_text()).strip()

        page.remove_listener("response", handle_response)
        return exercise

    except Exception as e:
        print(f"  ✗ Error scraping {url}: {e}")
        return None


async def scrape_muscle_category(page: Page, muscle_slug: str) -> list[str]:
    """Returns a list of exercise URLs for a given muscle."""
    url = f"{BASE_URL}/muscles/{muscle_slug}"
    print(f"→ Scanning muscle: {muscle_slug}")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        links = await page.query_selector_all("a[href*='/exercises/']")
        urls = set()
        for link in links:
            href = await link.get_attribute("href")
            if href:
                full = href if href.startswith("http") else f"{BASE_URL}{href}"
                urls.add(full)
        return list(urls)
    except Exception as e:
        print(f"  ✗ Error scanning {muscle_slug}: {e}")
        return []


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Resume from existing data if interrupted
    existing = []
    existing_urls = set()
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
        existing_urls = {e.get("musclewikiUrl") for e in existing if e.get("musclewikiUrl")}
        print(f"Resuming — {len(existing)} exercises already scraped")

    all_exercise_urls: set[str] = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        # Step 1: Collect all exercise URLs
        print("\n=== Phase 1: Collecting exercise URLs ===")
        for slug in MUSCLE_SLUGS:
            urls = await scrape_muscle_category(page, slug)
            all_exercise_urls.update(urls)
            print(f"  Found {len(urls)} exercises — total so far: {len(all_exercise_urls)}")
            await asyncio.sleep(1)

        print(f"\nTotal unique exercise URLs: {len(all_exercise_urls)}")

        # Step 2: Scrape each exercise
        print("\n=== Phase 2: Scraping exercise details ===")
        results = list(existing)
        new_urls = all_exercise_urls - existing_urls

        for i, url in enumerate(sorted(new_urls), 1):
            print(f"[{i}/{len(new_urls)}] {url}")
            data = await scrape_exercise(page, url)
            if data:
                results.append(data)
                print(f"  ✓ {data.get('name', 'Unknown')}")
            else:
                print(f"  ✗ Skipped")

            # Save progress every 10 exercises
            if i % 10 == 0:
                OUTPUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
                print(f"  💾 Progress saved ({len(results)} total)")

            await asyncio.sleep(1.5)  # polite delay

        await browser.close()

    OUTPUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n✅ Done! {len(results)} exercises saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
