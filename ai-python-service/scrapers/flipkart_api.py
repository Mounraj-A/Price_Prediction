import requests
from utils.product_utils import (
    normalize_name,
    generate_standard_product_key,
    extract_brand,
)

import json

SCRAPINGDOG_API_KEY = "69b7fa256ce890617009a69b"


def parse_price(price_str):
    try:
        if not price_str:
            return 0.0
        return float(price_str.replace("₹", "").replace(",", "").strip())
    except:
        return 0.0


def parse_rating(rating_str):
    try:
        if not rating_str:
            return 0.0
        return float(rating_str.split()[0])
    except:
        return 0.0


def fetch_flipkart_products(product):

    url = "https://api.scrapingdog.com/flipkart/search"

    params = {
        "api_key": SCRAPINGDOG_API_KEY,
        "url": f"https://www.flipkart.com/search?q={product}"
    }

    try:
        response = requests.get(url, params=params, timeout=60)

        # Debug raw response (truncate)
        try:
            print("🧾 Flipkart raw JSON (truncated):", json.dumps(response.json())[:2000])
        except Exception:
            print("🧾 Flipkart raw text (truncated):", (response.text or "")[:2000])

        if response.status_code != 200:
            return []

        data = response.json()
        items = data.get("search_results") or data.get("products") or data.get("data") or []

        products = []

        for item in items:

            title = (item.get("title")
                     or item.get("product_title")
                     or item.get("name")
                     or "")
            title = str(title).strip()
            if not title:
                continue

            raw_price = item.get("price") or item.get("product_price") or item.get("productPrice") or ""
            price = parse_price(raw_price)

            rating = parse_rating(item.get("rating") or item.get("product_rating") or "")

            link = item.get("link") or item.get("product_url") or item.get("product_url") or item.get("url") or ""
            image = item.get("image") or item.get("product_photo") or item.get("product_photo") or ""

            products.append({
                "productName": title,
                "normalizedName": normalize_name(title),
                "productKey": generate_standard_product_key(title),

                "platform": "flipkart",
                "price": price,
                "rating": rating,

                "brand": extract_brand(title),
                "offer": item.get("discount") or item.get("offer") or "",

                "link": link,
                "image": image,
            })

        return products

    except Exception as e:
        print("❌ Flipkart Error:", str(e))
        return []