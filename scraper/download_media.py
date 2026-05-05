#!/usr/bin/env python3
"""
download_media.py — Download all MuscleWiki media locally for resilience.

Downloads ~5434 videos + ~1754 images to public/data/media/
Resumes automatically if interrupted.
Updates exercises.json with local paths when done.

Usage:
  scraper/.venv/bin/python scraper/download_media.py           # Full download
  scraper/.venv/bin/python scraper/download_media.py --test    # Test hotlinking on 3 URLs
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import aiohttp
except ImportError:
    print("Installing aiohttp...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "aiohttp"], check=True)
    import aiohttp

PROJECT_ROOT = Path(__file__).parent.parent
EXERCISES_FILE = PROJECT_ROOT / "public" / "data" / "exercises.json"
VIDEOS_DIR = PROJECT_ROOT / "public" / "data" / "media" / "videos"
IMAGES_DIR = PROJECT_ROOT / "public" / "data" / "media" / "images"
PROGRESS_FILE = Path("/tmp/mw_download_progress.json")

CONCURRENT = 10
TIMEOUT = 40
MAX_RETRIES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://musclewiki.com/",
}


def url_to_local_path(url: str) -> Path:
    """Derive a stable local filename from a URL."""
    parsed = urlparse(url)
    filename = parsed.path.split("/")[-1]
    filename = re.sub(r"[^\w\-.]", "-", filename)
    if url.endswith(".mp4") or "/videos/" in url:
        return VIDEOS_DIR / filename
    else:
        return IMAGES_DIR / filename


def url_to_web_path(url: str) -> str:
    """Convert a URL to its local web path (relative to /public)."""
    local = url_to_local_path(url)
    return "/" + str(local.relative_to(PROJECT_ROOT / "public"))


async def download_file(
    session: aiohttp.ClientSession,
    url: str,
    dest: Path,
    semaphore: asyncio.Semaphore,
) -> bool:
    async with semaphore:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with session.get(
                    url, headers=HEADERS,
                    timeout=aiohttp.ClientTimeout(total=TIMEOUT)
                ) as resp:
                    if resp.status == 200:
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(await resp.read())
                        return True
                    elif resp.status in (403, 404):
                        return False  # don't retry permanent errors
                    elif attempt < MAX_RETRIES:
                        await asyncio.sleep(2 ** attempt)
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(2 ** attempt)
        return False


async def test_hotlink(exercises: list[dict]) -> None:
    sample_urls = []
    for ex in exercises[:5]:
        vu = ex.get("videoUrls") or {}
        for v in vu.values():
            if v and v.startswith("http"):
                sample_urls.append(v)
                break
        if len(sample_urls) >= 3:
            break

    print("=== Testing hotlinking ===")
    async with aiohttp.ClientSession() as session:
        for url in sample_urls:
            try:
                async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=10)) as r:
                    print(f"  {'✓' if r.status == 200 else '✗'} [{r.status}] {url[:80]}")
            except Exception as e:
                print(f"  ✗ [error] {url[:70]}: {e}")
    print("\nIf all ✓: hotlinking works but CDN access can be revoked anytime.")
    print("Run without --test to back up all media locally.\n")


async def main() -> None:
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    if not EXERCISES_FILE.exists():
        print("exercises.json not found")
        sys.exit(1)

    exercises = json.loads(EXERCISES_FILE.read_text())
    print(f"Loaded {len(exercises)} exercises")

    if "--test" in sys.argv:
        await test_hotlink(exercises)
        return

    # Load progress
    downloaded: set[str] = set()
    if PROGRESS_FILE.exists():
        try:
            downloaded = set(json.loads(PROGRESS_FILE.read_text()))
            print(f"Resuming: {len(downloaded)} URLs already downloaded")
        except Exception:
            pass

    # Collect all URLs
    url_to_path: dict[str, Path] = {}
    for ex in exercises:
        vu = ex.get("videoUrls") or {}
        for v in vu.values():
            if v and v.startswith("http"):
                url_to_path[v] = url_to_local_path(v)
        gi = ex.get("gifUrl")
        if gi and gi.startswith("http"):
            url_to_path[gi] = url_to_local_path(gi)

    to_download = [
        (url, path)
        for url, path in url_to_path.items()
        if url not in downloaded and not path.exists()
    ]

    print(f"Total URLs: {len(url_to_path)}")
    print(f"Already done: {len(url_to_path) - len(to_download)}")
    print(f"To download: {len(to_download)}\n")

    if not to_download:
        print("All files already present!")
    else:
        semaphore = asyncio.Semaphore(CONCURRENT)
        ok = 0
        fail = 0
        completed = 0

        connector = aiohttp.TCPConnector(limit=CONCURRENT, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            async def download_and_track(url: str, path: Path) -> tuple[str, bool]:
                result = await download_file(session, url, path, semaphore)
                return url, result

            tasks = [
                asyncio.create_task(download_and_track(url, path))
                for url, path in to_download
            ]
            for coro in asyncio.as_completed(tasks):
                url, result = await coro
                completed += 1
                if result:
                    ok += 1
                    downloaded.add(url)
                else:
                    fail += 1

                if completed % 100 == 0 or completed == len(to_download):
                    pct = 100 * completed / len(to_download)
                    print(f"  [{completed}/{len(to_download)}] {pct:.0f}% — ok:{ok} fail:{fail}")
                    PROGRESS_FILE.write_text(json.dumps(list(downloaded)))

        print(f"\nDownload complete: {ok} ok, {fail} failed")

    # Update exercises.json with local paths
    print("\nUpdating exercises.json with local paths...")
    updated = 0
    for ex in exercises:
        changed = False
        vu = ex.get("videoUrls") or {}
        new_vu: dict[str, str | None] = {}
        for k, v in vu.items():
            if v and v.startswith("http"):
                p = url_to_local_path(v)
                new_vu[k] = url_to_web_path(v) if p.exists() else v
                if new_vu[k] != v:
                    changed = True
            else:
                new_vu[k] = v
        if changed:
            ex["videoUrls"] = new_vu

        gi = ex.get("gifUrl")
        if gi and gi.startswith("http"):
            p = url_to_local_path(gi)
            if p.exists():
                ex["gifUrl"] = url_to_web_path(gi)
                changed = True

        if changed:
            updated += 1

    EXERCISES_FILE.write_text(json.dumps(exercises, indent=2, ensure_ascii=False))
    print(f"Updated {updated} exercises with local paths")
    print(f"\n✓ Done! Media backed up to:")
    print(f"  Videos: {VIDEOS_DIR} ({len(list(VIDEOS_DIR.glob('*.mp4')))} files)")
    print(f"  Images: {IMAGES_DIR} ({len(list(IMAGES_DIR.glob('*.jpg')))} files)")


if __name__ == "__main__":
    asyncio.run(main())

