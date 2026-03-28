import requests
import re
from difflib import SequenceMatcher

from utils.product_utils import (
    normalize_name,
    generate_product_key,
    extract_brand,
    is_valid_product
)

RAPID_API_KEY = "886af5408cmshda39eecf08870c8p13ec43jsn3c5bf409054a"


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

        if response.status_code != 200:
            print("❌ API Error:", response.text)
            return []

        data = response.json()

        items = data.get("data", {}).get("products", []) or data.get("products", [])

        if not items:
            print("⚠️ No Amazon products found")
            return []

        products = []

        for item in items[:20]:

            title = item.get("product_title")

            raw_price = (
                item.get("product_price")
                or item.get("price")
                or item.get("product_original_price")
            )

            if not title or not raw_price:
                continue

            # ----------------------------
            # 🔥 BASIC FILTER
            # ----------------------------
            if not is_valid_product(title):
                continue

            # ----------------------------
            # 🔥 NLP FILTER (MAIN FIX)
            # ----------------------------
            if not is_relevant_product(title, product):
                continue

            # ----------------------------
            # PRICE CLEAN
            # ----------------------------
            price = parse_price(raw_price)

            if price < 10000 or price > 200000:
                continue

            products.append({
                "productName": title.strip(),
                "normalizedName": normalize_name(title),
                "productKey": generate_product_key(title),

                "platform": "Amazon",
                "price": price,
                "rating": safe_float(item.get("product_star_rating", 0)),

                "brand": extract_brand(title),
                "offer": item.get("product_num_ratings", ""),

                "link": item.get("product_url"),
                "image": item.get("product_photo")
            })

        print(f"✅ Amazon filtered products: {len(products)}")

        return products

    except Exception as e:
        print("❌ Amazon Exception:", str(e))
        return []