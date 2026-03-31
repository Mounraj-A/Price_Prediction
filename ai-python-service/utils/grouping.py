from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List

from utils.product_utils import ensure_product_attributes_from_listing, generate_product_key


def _listing_title(p: Dict[str, Any]) -> str:
    return (p.get("productName") or p.get("product_name") or "").strip()


def group_products(products: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Group listings by identical variant using product_key only (same SKU / storage tier).

    128GB and 256GB (and other variants) never share a bucket — keys come from
    utils.product_utils.generate_product_key (variant-aware).

    Returns:
        {
            "apple_iphone15_128gb": { "offers": [ ... ] },
            "apple_iphone15_256gb": { "offers": [ ... ] },
        }

    Each offer dict is the original product row (with productKey / normalizedName filled when
    productName was present).
    """
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for raw in products:
        p = dict(raw)
        title = _listing_title(p)

        if title:
            ensure_product_attributes_from_listing(p)
        else:
            pk = (p.get("productKey") or "").strip()
            if not pk:
                continue
            p["productKey"] = pk

        key = (p.get("productKey") or "").strip()
        if not key and title:
            key = generate_product_key(title)
            p["productKey"] = key
        if not key:
            continue

        groups[key].append(p)

    out: Dict[str, Dict[str, Any]] = {}
    for key, items in groups.items():
        items_sorted = sorted(items, key=lambda x: float(x.get("price") or 0))
        out[key] = {"offers": items_sorted}

    return out


if __name__ == "__main__":
    sample = [
        {
            "productName": "Apple iPhone 15 (Blue, 128 GB)",
            "price": 54900,
            "platform": "Flipkart",
        },
        {
            "productName": "Apple iPhone 15 (Black, 256 GB)",
            "price": 64900,
            "platform": "Amazon",
        },
        {
            "productName": "Apple iPhone 15 (Pink, 128 GB)",
            "price": 55900,
            "platform": "Amazon",
        },
        {
            "productName": "Apple iPhone 15 (Green, 256 GB)",
            "price": 63900,
            "platform": "Flipkart",
        },
    ]

    result = group_products(sample)
    print("Keys:", sorted(result.keys()))
    for k, v in result.items():
        print(f"\n{k}: {len(v['offers'])} offer(s), prices={[o['price'] for o in v['offers']]}")

    assert "apple_iphone15_128gb" in result
    assert "apple_iphone15_256gb" in result
    assert len(result["apple_iphone15_128gb"]["offers"]) == 2
    assert len(result["apple_iphone15_256gb"]["offers"]) == 2
    print("\nAll assertions passed.")
