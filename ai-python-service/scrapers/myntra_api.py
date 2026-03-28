import requests
import re

SCRAPINGDOG_API_KEY = "69b7fa256ce890617009a69b,"


def normalize_name(title):
    return re.sub(r'[^a-z0-9 ]', '', title.lower()).strip() if title else ""


def safe_float(val):
    try:
        return float(val)
    except:
        return 0.0


def fetch_myntra_products(product):

    url = "https://api.scrapingdog.com/myntra/search"

    params = {
        "api_key": SCRAPINGDOG_API_KEY,
        "url": f"https://www.myntra.com/{product}?rawQuery={product}"
    }

    try:

        response = requests.get(url, params=params, timeout=10)

        if response.status_code != 200:
            return []

        data = response.json()
        results = data.get("search_results", [])

        products = []

        for item in results:

            title = item.get("productName") or item.get("product")
            if not title:
                continue

            price = safe_float(item.get("price"))
            if price == 0:
                continue

            link = item.get("landingPageUrl")
            if link:
                link = f"https://www.myntra.com/{link}"

            normalized_name = normalize_name(title)

            products.append({
                "productName": title.strip(),
                "normalizedName": normalized_name,
                "platform": "Myntra",
                "price": price,
                "rating": safe_float(item.get("rating", 0)),
                "brand": item.get("brand", ""),
                "offer": "",
                "link": link,
                "image": item.get("searchImage")
            })

        return products

    except Exception:
        return []