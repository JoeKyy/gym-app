#!/usr/bin/env python3
"""
Scrape equipment icons from MuscleWiki workout-generator/equipment page.
Saves each icon as SVG or PNG in public/icons/equipment/
"""

import asyncio
import base64
import re
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(__file__).parent.parent / "public/icons/equipment"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MAP_FILE = Path(__file__).parent.parent / "public/icons/equipment/map.json"

URL = "https://musclewiki.com/pt-br/workout-generator/equipment"

# Our internal equipment IDs → expected MuscleWiki label patterns
EQUIPMENT_ID_MAP = {
    "barbell": "Barbell",
    "dumbbell": "Dumbbells",
    "bodyweight": "Bodyweight",
    "machine": "Machine",
    "cables": "Cables",
    "kettlebell": "Kettlebells",
    "band": "Band",
    "medicineball": "Medicine-Ball",
    "bosuball": "Bosu-Ball",
    "plate": "Plate",
    "smithmachine": "Smith-Machine",
    "trx": "TRX",
    "yoga": "Yoga",
    "cardio": "Cardio",
    "recovery": "Recovery",
    "stretches": "Stretches",
}


async def scrape():
    icon_map = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print(f"Loading {URL} ...")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)

        # Take a screenshot for debugging
        await page.screenshot(path="/tmp/mw_equipment.png")
        print("Screenshot saved to /tmp/mw_equipment.png")

        # Find equipment items — they usually have a card/button structure
        # with an image/svg and a label
        cards = await page.query_selector_all("[class*='equipment'], [class*='Equipment'], button[class*='card'], .grid > div, .grid > button")
        print(f"Found {len(cards)} potential equipment cards")

        for card in cards:
            label_el = await card.query_selector("p, span, h2, h3, [class*='label'], [class*='name'], [class*='title']")
            img_el = await card.query_selector("img, svg")

            if not label_el:
                continue
            label = (await label_el.inner_text()).strip()
            if not label:
                continue

            print(f"  Card: '{label}'")

            if img_el:
                tag = await img_el.evaluate("el => el.tagName.toLowerCase()")
                if tag == "img":
                    src = await img_el.get_attribute("src") or ""
                    # Download the image
                    slug = label.lower().replace(" ", "-").replace("/", "-")
                    if src.startswith("data:image"):
                        # Base64 embedded
                        _, data = src.split(",", 1)
                        ext = "png" if "png" in src else "jpg"
                        filepath = OUTPUT_DIR / f"{slug}.{ext}"
                        filepath.write_bytes(base64.b64decode(data))
                        icon_map[label] = f"/icons/equipment/{slug}.{ext}"
                        print(f"    Saved base64 image → {filepath.name}")
                    elif src:
                        # External URL — download it
                        full_url = src if src.startswith("http") else f"https://musclewiki.com{src}"
                        try:
                            response = await page.evaluate(f"""
                                async () => {{
                                    const r = await fetch('{full_url}');
                                    const buf = await r.arrayBuffer();
                                    const bytes = new Uint8Array(buf);
                                    return Array.from(bytes);
                                }}
                            """)
                            slug = label.lower().replace(" ", "-").replace("/", "-")
                            ext = full_url.split(".")[-1].split("?")[0]
                            if ext not in ("png", "jpg", "jpeg", "webp", "svg"):
                                ext = "png"
                            filepath = OUTPUT_DIR / f"{slug}.{ext}"
                            filepath.write_bytes(bytes(response))
                            icon_map[label] = f"/icons/equipment/{slug}.{ext}"
                            print(f"    Downloaded → {filepath.name}")
                        except Exception as e:
                            print(f"    Error downloading {full_url}: {e}")

                elif tag == "svg":
                    # Get SVG HTML
                    svg_html = await img_el.evaluate("el => el.outerHTML")
                    slug = label.lower().replace(" ", "-").replace("/", "-")
                    filepath = OUTPUT_DIR / f"{slug}.svg"
                    filepath.write_text(svg_html)
                    icon_map[label] = f"/icons/equipment/{slug}.svg"
                    print(f"    Saved SVG → {filepath.name}")

        # If no cards found via selector, try a different approach
        if not icon_map:
            print("\nTrying alternative selectors...")
            # Get all img tags on the page
            all_imgs = await page.query_selector_all("img")
            print(f"Total img tags: {len(all_imgs)}")
            for img in all_imgs:
                src = await img.get_attribute("src") or ""
                alt = await img.get_attribute("alt") or ""
                print(f"  img src={src[:80]} alt={alt}")

            # Get page HTML for analysis
            html = await page.content()
            Path("/tmp/mw_equipment.html").write_text(html)
            print("HTML saved to /tmp/mw_equipment.html")

        await browser.close()

    # Save icon map
    MAP_FILE.write_text(json.dumps(icon_map, indent=2, ensure_ascii=False))
    print(f"\nIcon map saved with {len(icon_map)} entries → {MAP_FILE}")
    return icon_map


if __name__ == "__main__":
    asyncio.run(scrape())
