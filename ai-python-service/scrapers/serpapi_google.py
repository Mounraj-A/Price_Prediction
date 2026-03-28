from serpapi import GoogleSearch
from utils.currency_converter import convert_price_to_inr
from utils.product_utils import (
    normalize_name,
    generate_product_key,
    extract_brand,
    is_valid_product
)

API_KEY = "4c6de9f8b89a2b6be41fe01347785646eb1e00b1229a832e9c15fce47089b48a,"


def fetch_google_products(product):

    params = {
        "engine": "google_shopping",
        "q": product,
        "api_key": API_KEY
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    products = []

    for item in results.get("shopping_results", []):

        title = item.get("title")
        if not title:
            continue

        # 🔥 FILTER BAD PRODUCTS
        if not is_valid_product(title):
            continue

        price = convert_price_to_inr(
            item.get("extracted_price") or item.get("price"),
            source="google"
        )

        # Allow a wide price range: ₹100 to ₹5,00,000
        if price < 100 or price > 500000:
            continue

        products.append({
            "productName": title.strip(),
            "normalizedName": normalize_name(title),
            "productKey": generate_product_key(title),

            "platform": item.get("source") or "Google",
            "price": float(price),
            "rating": float(item.get("rating", 0) or 0),

            "brand": extract_brand(title),
            "offer": "",

            "link": item.get("link"),
            "image": item.get("thumbnail")
        })

    return products