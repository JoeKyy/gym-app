#!/usr/bin/env python3
"""
ExRx.net scraper — collects exercise names, instructions, and classification.
Saves raw data to scraper/data/exrx_raw.json
"""

import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright, Page

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "exrx_raw.json"
BASE_URL = "https://exrx.net"

# ExRx exercise list pages by body part
EXERCISE_LIST_URLS = [
    f"{BASE_URL}/Lists/ExList/ChestWt",
    f"{BASE_URL}/Lists/ExList/BackWt",
    f"{BASE_URL}/Lists/ExList/ShldWt",
    f"{BASE_URL}/Lists/ExList/ArmWt",
    f"{BASE_URL}/Lists/ExList/ForeArmWt",
    f"{BASE_URL}/Lists/ExList/WaistWt",
    f"{BASE_URL}/Lists/ExList/HipsWt",
    f"{BASE_URL}/Lists/ExList/ThighWt",
    f"{BASE_URL}/Lists/ExList/CalfWt",
    f"{BASE_URL}/Lists/ExList/NeckWt",
    f"{BASE_URL}/Lists/ExList/ChestBW",
    f"{BASE_URL}/Lists/ExList/BackBW",
    f"{BASE_URL}/Lists/ExList/ShldBW",
    f"{BASE_URL}/Lists/ExList/ArmBW",
    f"{BASE_URL}/Lists/ExList/WaistBW",
    f"{BASE_URL}/Lists/ExList/HipsBW",
    f"{BASE_URL}/Lists/ExList/ThighBW",
    f"{BASE_URL}/Lists/ExList/CalfBW",
]


async def scrape_exercise_page(page: Page, url: str) -> dict | None:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1500)

        exercise: dict = {"exrxUrl": url, "steps": [], "muscles": {}}

        # Name
        h1 = await page.query_selector("h1.page-title, h1, .entry-title")
        if h1:
            exercise["name"] = (await h1.inner_text()).strip()

        # Classification table
        tables = await page.query_selector_all("table")
        for table in tables:
            rows = await table.query_selector_all("tr")
            for row in rows:
                cells = await row.query_selector_all("td, th")
                if len(cells) >= 2:
                    key = (await cells[0].inner_text()).strip().lower()
                    val = (await cells[1].inner_text()).strip()
                    if "utility" in key or "mechanic" in key:
                        exercise["mechanic"] = val.lower()
                    elif "force" in key:
                        exercise["force"] = val.lower()
                    elif "equipment" in key:
                        exercise["equipment"] = val

        # Muscles
        sections = await page.query_selector_all("div.col-sm-6, div.col-md-6, section")
        for section in sections:
            heading = await section.query_selector("h2, h3, h4, strong")
            if not heading:
                continue
            heading_txt = (await heading.inner_text()).strip().lower()
            if "target" in heading_txt or "agonist" in heading_txt:
                lis = await section.query_selector_all("li")
                exercise["muscles"]["target"] = [(await li.inner_text()).strip() for li in lis]
            elif "synergist" in heading_txt or "secondary" in heading_txt:
                lis = await section.query_selector_all("li")
                exercise["muscles"]["secondary"] = [(await li.inner_text()).strip() for li in lis]
            elif "stabilizer" in heading_txt:
                lis = await section.query_selector_all("li")
                exercise["muscles"]["stabilizers"] = [(await li.inner_text()).strip() for li in lis]

        # Instructions — numbered lists in main content
        main = await page.query_selector("article, main, .entry-content, #content")
        if main:
            steps_els = await main.query_selector_all("ol li")
            exercise["steps"] = [(await el.inner_text()).strip() for el in steps_els if (await el.inner_text()).strip()]

            # Comments / tips
            p_els = await main.query_selector_all("p")
            tips = []
            for p in p_els:
                txt = (await p.inner_text()).strip()
                if txt and len(txt) > 30 and not any(k in txt.lower() for k in ["copyright", "privacy", "cookie"]):
                    tips.append(txt)
            if tips:
                exercise["tips"] = " ".join(tips[:3])

        return exercise if exercise.get("name") else None

    except Exception as e:
        print(f"  ✗ Error: {url} — {e}")
        return None


async def collect_exercise_urls(page: Page, list_url: str) -> list[str]:
    try:
        await page.goto(list_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1500)

        links = await page.query_selector_all("a[href*='/WeightExercises/'], a[href*='/Exercises/']")
        urls = []
        for link in links:
            href = await link.get_attribute("href")
            if href:
                full = href if href.startswith("http") else f"{BASE_URL}{href}"
                urls.append(full)
        return list(set(urls))
    except Exception as e:
        print(f"  ✗ Error collecting from {list_url}: {e}")
        return []


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    existing = []
    existing_urls = set()
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
        existing_urls = {e.get("exrxUrl") for e in existing if e.get("exrxUrl")}
        print(f"Resuming — {len(existing)} exercises already scraped")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        # Phase 1: Collect URLs
        print("\n=== Phase 1: Collecting exercise URLs ===")
        all_urls: set[str] = set()
        for list_url in EXERCISE_LIST_URLS:
            print(f"→ {list_url}")
            urls = await collect_exercise_urls(page, list_url)
            all_urls.update(urls)
            print(f"  Found {len(urls)} exercises — total: {len(all_urls)}")
            await asyncio.sleep(1)

        # Phase 2: Scrape details
        print(f"\n=== Phase 2: Scraping {len(all_urls)} exercises ===")
        results = list(existing)
        new_urls = all_urls - existing_urls

        for i, url in enumerate(sorted(new_urls), 1):
            print(f"[{i}/{len(new_urls)}] {url}")
            data = await scrape_exercise_page(page, url)
            if data:
                results.append(data)
                print(f"  ✓ {data.get('name', 'Unknown')}")

            if i % 20 == 0:
                OUTPUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
                print(f"  💾 Saved {len(results)} so far")

            await asyncio.sleep(1)

        await browser.close()

    OUTPUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n✅ Done! {len(results)} exercises saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
