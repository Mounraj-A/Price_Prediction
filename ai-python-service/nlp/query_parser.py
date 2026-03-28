import re

def parse_query(query):

    query = query.lower()

    parsed = {
        "keyword": "",
        "max_price": None,
        "brand": None
    }

    # Detect price filters
    price_match = re.search(r"(under|below|less than)\s*(\d+)", query)

    if price_match:
        parsed["max_price"] = int(price_match.group(2))

    # Remove price text from query
    query = re.sub(r"(under|below|less than)\s*\d+", "", query)

    # Detect brands
    brands = ["oppo", "iphone", "samsung", "vivo", "realme", "oneplus"]

    for brand in brands:
        if brand in query:
            parsed["brand"] = brand

    # Remaining words become keyword
    parsed["keyword"] = query.strip()

    return parsed