from collections import defaultdict
from utils.product_utils import normalize_variant


def group_products(products):
    """
    Groups similar products across platforms
    Returns best product per group + all offers
    """

    groups = defaultdict(list)

    for p in products:
        key = normalize_variant(p["productName"])
        groups[key].append(p)

    final = []

    for key, items in groups.items():

        # 🔥 sort by price
        items = sorted(items, key=lambda x: x["price"])

        best = items[0]

        final.append({
            "productKey": best["productKey"],
            "productName": best["productName"],
            "normalizedName": best["normalizedName"],
            "brand": best["brand"],

            "lowestPrice": best["price"],
            "platform": best["platform"],

            "offers": items,  # 🔥 ALL platform prices
            "offerCount": len(items)
        })

    return final