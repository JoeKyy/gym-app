#!/usr/bin/env python3
"""
MuscleWiki API Workout & Routine Fetcher
Requires ULTRA or MEGA API key.

Usage:
  export MW_API_KEY="mw_your_key_here"
  python3 scraper/fetch_mw_workouts.py

Saves:
  public/data/mw_workouts.json  — all workouts with full exercise details
  public/data/mw_routines.json  — all routines with workout references
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    os.system("pip3 install httpx --break-system-packages -q")
    import httpx

API_KEY = os.environ.get("MW_API_KEY", "")
BASE_URL = "https://api.musclewiki.com"
OUT_DIR = Path(__file__).parent.parent / "public/data"

HEADERS = {"X-API-Key": API_KEY}


async def fetch_all_workouts(client: httpx.AsyncClient) -> list[dict]:
    """Fetch all workouts with full details (paginated)."""
    workouts = []
    offset = 0
    limit = 50

    print("Fetching workouts list...")
    while True:
        r = await client.get(f"{BASE_URL}/workouts", params={"limit": limit, "offset": offset}, headers=HEADERS)
        if r.status_code == 403:
            print("ERROR: 403 Forbidden — API key requires ULTRA or MEGA tier for workouts.")
            return []
        if r.status_code != 200:
            print(f"ERROR {r.status_code}: {r.text[:200]}")
            break

        data = r.json()
        results = data.get("results", data if isinstance(data, list) else [])
        print(f"  Page {offset // limit + 1}: {len(results)} workouts")

        for item in results:
            # Fetch full workout with exercise details
            wid = item.get("id")
            try:
                rf = await client.get(f"{BASE_URL}/workouts/{wid}/full", headers=HEADERS)
                if rf.status_code == 200:
                    workouts.append(rf.json())
                else:
                    workouts.append(item)
                await asyncio.sleep(0.15)  # Rate limiting
            except Exception as e:
                print(f"  Error fetching workout {wid}: {e}")
                workouts.append(item)

        if isinstance(data, dict):
            total = data.get("total", 0)
            offset += limit
            if offset >= total or len(results) < limit:
                break
        else:
            break

    return workouts


async def fetch_all_routines(client: httpx.AsyncClient) -> list[dict]:
    """Fetch all routines (paginated)."""
    routines = []
    offset = 0
    limit = 50

    print("Fetching routines list...")
    while True:
        r = await client.get(f"{BASE_URL}/routines", params={"limit": limit, "offset": offset}, headers=HEADERS)
        if r.status_code == 403:
            print("ERROR: 403 Forbidden — API key requires ULTRA or MEGA tier for routines.")
            return []
        if r.status_code != 200:
            print(f"ERROR {r.status_code}: {r.text[:200]}")
            break

        data = r.json()
        results = data.get("results", data if isinstance(data, list) else [])
        print(f"  Page {offset // limit + 1}: {len(results)} routines")

        for item in results:
            rid = item.get("id")
            try:
                rf = await client.get(f"{BASE_URL}/routines/{rid}/full", headers=HEADERS)
                if rf.status_code == 200:
                    routines.append(rf.json())
                else:
                    routines.append(item)
                await asyncio.sleep(0.2)
            except Exception as e:
                print(f"  Error fetching routine {rid}: {e}")
                routines.append(item)

        if isinstance(data, dict):
            total = data.get("total", 0)
            offset += limit
            if offset >= total or len(results) < limit:
                break
        else:
            break

    return routines


async def main():
    if not API_KEY:
        print("ERROR: MW_API_KEY environment variable not set.")
        print("Usage: export MW_API_KEY='mw_your_key_here' && python3 scraper/fetch_mw_workouts.py")
        sys.exit(1)

    print(f"Using API key: {API_KEY[:8]}...")

    async with httpx.AsyncClient(timeout=30) as client:
        # Verify key
        r = await client.get(f"{BASE_URL}/health", headers=HEADERS)
        if r.status_code != 200:
            print(f"ERROR: API key invalid or API unreachable. Status: {r.status_code}")
            sys.exit(1)
        print(f"API healthy: {r.json()}")

        workouts = await fetch_all_workouts(client)
        routines = await fetch_all_routines(client)

    # Save
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    w_file = OUT_DIR / "mw_workouts.json"
    w_file.write_text(json.dumps(workouts, indent=2, ensure_ascii=False))
    print(f"\n✓ Saved {len(workouts)} workouts → {w_file}")

    r_file = OUT_DIR / "mw_routines.json"
    r_file.write_text(json.dumps(routines, indent=2, ensure_ascii=False))
    print(f"✓ Saved {len(routines)} routines → {r_file}")


if __name__ == "__main__":
    asyncio.run(main())
