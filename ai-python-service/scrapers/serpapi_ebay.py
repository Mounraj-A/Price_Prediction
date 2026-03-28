from serpapi import GoogleSearch
import re
from utils.currency_converter import convert_price_to_inr

SERP_API_KEY = "4c6de9f8b89a2b6be41fe01347785646eb1e00b1229a832e9c15fce47089b48a,"


def normalize_name(title):
    return re.sub(r'[^a-z0-9 ]', '', title.lower()).strip() if title else ""


def fetch_ebay_products(product):

    params = {
        "engine": "ebay",
        "_nkw": product,
        "ebay_domain": "ebay.com",
        "api_key": SERP_API_KEY
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    products = []

    for item in results.get("organic_results", []):

        title = item.get("title")
        if not title:
            continue

        raw_price = item.get("extracted_price") or item.get("price")

        price = convert_price_to_inr(raw_price, source="ebay")

        if price == 0:
            continue

        normalized_name = normalize_name(title)

        products.append({
            "productName": title.strip(),
            "normalizedName": normalized_name,
            "platform": "eBay",
            "price": float(price),
            "rating": 0.0,
            "brand": "",
            "offer": "",
            "link": item.get("link"),
            "image": item.get("thumbnail")
        })

    return products