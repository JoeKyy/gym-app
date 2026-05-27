#!/usr/bin/env python3
"""
bodymap_downloader.py — Download MuscleWiki bodymap images for all exercises.

Bodymap images are publicly accessible at:
  https://media.musclewiki.com/media/uploads/videos/bodymaps/{slug}_impacted_{theme}_{view}_{gender}.png

Downloads 2 variants per exercise (dark theme, male):
  - {slug}_impacted_dark_front_male.png → bodymaps/{slug}-front.png
  - {slug}_impacted_dark_back_male.png  → bodymaps/{slug}-back.png

Usage:
  scraper/.venv/bin/python scraper/bodymap_downloader.py
  scraper/.venv/bin/python scraper/bodymap_downloader.py --test   # test 5 exercises only
"""

import asyncio
import json
import sys
import time
from pathlib import Path

try:
    import aiohttp
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "aiohttp"], check=True)
    import aiohttp

PROJECT_ROOT = Path(__file__).parent.parent
EXERCISES_FILE = PROJECT_ROOT / "public" / "data" / "exercises.json"
BODYMAPS_DIR = PROJECT_ROOT / "public" / "data" / "media" / "bodymaps"
PROGRESS_FILE = Path("/tmp/mw_bodymap_progress.json")

BASE_URL = "https://media.musclewiki.com/media/uploads/videos/bodymaps"
CONCURRENT = 8
TIMEOUT = 30
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://musclewiki.com/",
}


def load_progress() -> set[str]:
    if PROGRESS_FILE.exists():
        try:
            return set(json.loads(PROGRESS_FILE.read_text()))
        except Exception:
            pass
    return set()


def save_progress(done: set[str]) -> None:
    PROGRESS_FILE.write_text(json.dumps(list(done)))


async def download_bodymap(
    session: aiohttp.ClientSession,
    slug: str,
    view: str,
    semaphore: asyncio.Semaphore,
) -> tuple[str, bool]:
    """Download one bodymap image. Returns (slug-view, success)."""
    key = f"{slug}-{view}"
    url = f"{BASE_URL}/{slug}_impacted_dark_{view}_male.png"
    dest = BODYMAPS_DIR / f"{slug}-{view}.png"

    if dest.exists() and dest.stat().st_size > 1000:
        return key, True

    async with semaphore:
        try:
            async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    if len(data) > 1000:
                        dest.write_bytes(data)
                        return key, True
                    return key, False
                elif resp.status == 404:
                    return key, False
                else:
                    return key, False
        except Exception:
            return key, False


async def main(test_mode: bool = False) -> None:
    BODYMAPS_DIR.mkdir(parents=True, exist_ok=True)

    exercises = json.loads(EXERCISES_FILE.read_text())
    slugs = [ex["slug"] for ex in exercises if ex.get("slug")]

    if test_mode:
        slugs = slugs[:5]
        print(f"[TEST MODE] Testing {len(slugs)} exercises")
    else:
        print(f"Found {len(slugs)} exercises to process")

    done = load_progress()
    tasks_needed = [(slug, view) for slug in slugs for view in ("front", "back")
                    if f"{slug}-{view}" not in done]
    total = len(slugs) * 2
    already_done = total - len(tasks_needed)

    print(f"Already downloaded: {already_done}/{total}")
    print(f"Remaining: {len(tasks_needed)}")

    if not tasks_needed:
        print("All done!")
        return

    semaphore = asyncio.Semaphore(CONCURRENT)
    start = time.time()
    success = already_done
    failed = 0

    connector = aiohttp.TCPConnector(limit=CONCURRENT)
    async with aiohttp.ClientSession(connector=connector) as session:
        batch_size = 50
        for i in range(0, len(tasks_needed), batch_size):
            batch = tasks_needed[i:i + batch_size]
            results = await asyncio.gather(*[
                download_bodymap(session, slug, view, semaphore)
                for slug, view in batch
            ])
            for key, ok in results:
                if ok:
                    success += 1
                    done.add(key)
                else:
                    failed += 1

            save_progress(done)
            elapsed = time.time() - start
            rate = (success - already_done) / elapsed if elapsed > 0 else 0
            print(
                f"  Progress: {success}/{total} downloaded | "
                f"{failed} failed | {rate:.1f}/s | "
                f"batch {i // batch_size + 1}/{(len(tasks_needed) + batch_size - 1) // batch_size}"
            )

    print(f"\nDone! {success}/{total} bodymap images downloaded.")
    print(f"Saved to: {BODYMAPS_DIR}")


if __name__ == "__main__":
    test_mode = "--test" in sys.argv
    asyncio.run(main(test_mode))
