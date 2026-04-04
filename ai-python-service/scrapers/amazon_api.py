import requests
import re
import json
from difflib import SequenceMatcher

from utils.product_utils import (
    normalize_name,
    generate_standard_product_key,
    extract_brand,
)

RAPID_API_KEY = "69b211ff11mshda2a2b674b3ce87p1f233ajsn3102913a2603"


# ----------------------------
# SAFE FLOAT
# ----------------------------
def safe_float(value):
    try:
        return float(value)
    except:
        return 0.0


# ----------------------------
# 🔥 NLP SIMILARITY
# ----------------------------
def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()


def is_relevant_product(title: str, query: str) -> bool:
    if not title or not query:
        return False

    title_n = normalize_name(title)
    query_n = normalize_name(query)

    # ✅ direct match
    if query_n in title_n:
        return True

    # ✅ similarity match
    score = similarity(title_n, query_n)

    return score > 0.5   # 🔥 adjust threshold if needed


# ----------------------------
# 🔥 PRICE PARSER
# ----------------------------
def parse_price(raw_price):
    if not raw_price:
        return 0.0

    try:
        raw_price = str(raw_price)

        # handle range
        raw_price = raw_price.split("-")[0]

        # remove currency symbols
        raw_price = re.sub(r"[^\d.]", "", raw_price)

        return float(raw_price)

    except:
        return 0.0


# ----------------------------
# MAIN FUNCTION
# ----------------------------
def fetch_amazon_products(product):

    url = "https://real-time-amazon-data.p.rapidapi.com/search"

    querystring = {
        "query": product,
        "country": "IN",
        "page": "1"
    }

    headers = {
        "x-rapidapi-key": RAPID_API_KEY,
        "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=60)

        print("🔍 Amazon Status:", response.status_code)

        # Debug raw response (truncate to avoid huge logs)
        try:
            print("🧾 Amazon raw JSON (truncated):", json.dumps(response.json())[:2000])
        except Exception:
            print("🧾 Amazon raw text (truncated):", (response.text or "")[:2000])

        if response.status_code != 200:
            print("❌ API Error:", response.text)
            return []

        data = response.json()

        items = data.get("data", {}).get("products", []) or data.get("products", [])

        if not items:
            print("⚠️ No Amazon products found")
            return []

        products = []

        for item in items[:50]:

            # Flexible field mapping
            title = (item.get("title")
                     or item.get("product_title")
                     or item.get("productTitle")
                     or "")
            title = str(title).strip()

            raw_price = (item.get("price")
                         or item.get("product_price")
                         or item.get("productPrice")
                         or item.get("product_original_price")
                         or item.get("original_price")
                         or "")

            link = (item.get("link")
                    or item.get("product_url")
                    or item.get("productUrl")
                    or item.get("url")
                    or "")

            image = (item.get("image")
                     or item.get("product_photo")
                     or item.get("productPhoto")
                     or item.get("product_image")
                     or "")

            # Do NOT over-filter. Collect all items with at least a title.
            if not title:
                continue

            # Safe price (do not skip if parse fails)
            price = parse_price(raw_price)

            products.append({
                "productName": title,
                "normalizedName": normalize_name(title),
                "productKey": generate_standard_product_key(title),

                "platform": "amazon",
                "price": price,
                "rating": safe_float(item.get("rating") or item.get("product_star_rating") or 0),

                "brand": extract_brand(title),
                "offer": item.get("offer") or item.get("product_num_ratings") or "",

                "link": link,
                "image": image,
            })

        print(f"✅ Amazon filtered products: {len(products)}")

        return products

    except Exception as e:
        print("❌ Amazon Exception:", str(e))
        return []