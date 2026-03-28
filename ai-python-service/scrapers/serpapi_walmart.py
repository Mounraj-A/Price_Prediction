from serpapi import GoogleSearch
import re
from utils.currency_converter import convert_price_to_inr

SERP_API_KEY = "4c6de9f8b89a2b6be41fe01347785646eb1e00b1229a832e9c15fce47089b48a,"


def normalize_name(title):
    return re.sub(r'[^a-z0-9 ]', '', title.lower()).strip() if title else ""


def fetch_walmart_products(product):

    params = {
        "engine": "walmart",
        "query": product,
        "api_key": SERP_API_KEY
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    products = []

    for item in results.get("organic_results", []):

        title = item.get("title")
        if not title:
            continue

        raw_price = None

        if item.get("primary_offer"):
            raw_price = item["primary_offer"].get("offer_price")

        if not raw_price:
            raw_price = item.get("price")

        if not raw_price:
            raw_price = item.get("extracted_price")

        price = convert_price_to_inr(raw_price, source="walmart")

        if price == 0:
            continue

        normalized_name = normalize_name(title)

        products.append({
            "productName": title.strip(),
            "normalizedName": normalized_name,
            "platform": "Walmart",
            "price": float(price),
            "rating": float(item.get("rating", 0) or 0),
            "brand": "",
            "offer": "",
            "link": item.get("link"),
            "image": item.get("thumbnail")
        })

    return products