import requests
from utils.product_utils import (
    normalize_name,
    generate_product_key,
    extract_brand,
    is_valid_product
)

SCRAPINGDOG_API_KEY = "69b693f26073e904ada5e493"


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

        if response.status_code != 200:
            return []

        data = response.json()
        items = data.get("search_results") or data.get("products") or []

        products = []

        for item in items:

            title = item.get("title")
            if not title:
                continue

            # 🔥 FILTER BAD PRODUCTS
            if not is_valid_product(title):
                continue

            price = parse_price(item.get("price"))

            # 🔥 REMOVE GARBAGE PRICES
            if price < 10000 or price > 100000:
                continue

            rating = parse_rating(item.get("rating"))

            products.append({
                "productName": title.strip(),
                "normalizedName": normalize_name(title),
                "productKey": generate_product_key(title),

                "platform": "Flipkart",
                "price": price,
                "rating": rating,

                "brand": extract_brand(title),
                "offer": item.get("discount", ""),

                "link": item.get("url"),
                "image": item.get("image")
            })

        return products

    except Exception as e:
        print("❌ Flipkart Error:", str(e))
        return []