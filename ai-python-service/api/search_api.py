from fastapi import APIRouter
import time
import urllib.parse
import sys
from typing import Optional

from utils.product_utils import (
    ensure_product_attributes_from_listing,
    normalize_name,
    resolve_canonical_product_key,
    resolve_product_key_from_client,
)

# ----------------------------
# SAFE SCRAPERS
# ----------------------------
try:
    from scrapers.amazon_api import fetch_amazon_products
    print("✅ Amazon scraper imported successfully")
except Exception as e:
    print(f"❌ Failed to import Amazon scraper: {e}")
    fetch_amazon_products = lambda x: []

try:
    from scrapers.flipkart_api import fetch_flipkart_products
    print("✅ Flipkart scraper imported successfully")
except Exception as e:
    print(f"❌ Failed to import Flipkart scraper: {e}")
    fetch_flipkart_products = lambda x: []

# ----------------------------
# SAFE ML
# ----------------------------
try:
    from ml.prediction_service import get_price_prediction
except:
    def get_price_prediction(x):
        return {"predictedPrice": 0, "message": "ML not available"}

router = APIRouter()

# ----------------------------
# REMOVE DUPLICATES (KEEP BOTH PLATFORMS)
# ----------------------------
def remove_duplicates(products):
    """
    Remove exact duplicates from the same platform.
    Keep products from DIFFERENT platforms (for comparison).
    """
    seen = set()
    unique = []

    for p in products:
        # Create key from BOTH name AND platform
        # This way, Amazon iPhone 15 != Flipkart iPhone 15
        name_key = normalize_name(p.get("productName"))
        platform_key = (p.get("platform", "Unknown")).lower()
        combined_key = f"{platform_key}|{name_key}"

        if combined_key not in seen:
            seen.add(combined_key)
            unique.append(p)

    return unique

# ----------------------------
# RANKING
# ----------------------------
def rank_products(products):

    def score(p):
        price = p.get("price", 0)
        rating = p.get("rating", 0)

        return (rating * 2) - (price / 10000)

    return sorted(products, key=score, reverse=True)

# ----------------------------
# SEARCH API (FINAL DEBUG VERSION)
# ----------------------------
@router.get("/search")
def search_products(product: str):

    start_time = time.time()

    decoded_product = urllib.parse.unquote(product)

    print("\n🔥 SEARCH HIT:", decoded_product)
    sys.stdout.flush()

    try:
        # ----------------------------
        # FETCH
        # ----------------------------
        print("📡 Calling scrapers...")
        sys.stdout.flush()

        amazon = fetch_amazon_products(decoded_product) or []
        flipkart = fetch_flipkart_products(decoded_product) or []

        print(f"🟡 Amazon: {len(amazon)} products")
        print(f"🟡 Flipkart: {len(flipkart)} products")
        sys.stdout.flush()

        all_products = amazon + flipkart

        print("📦 Total fetched:", len(all_products))
        sys.stdout.flush()

        # FALLBACK
        # ----------------------------
        if not all_products:
            print(f"⚠ No products found for '{decoded_product}'")
            sys.stdout.flush()
            
            # Return an empty list instead of a fake demo product
            all_products = []

        # ----------------------------
        # productKey + normalizedName — only from listing productName (product_utils)
        # ----------------------------
        for p in all_products:
            ensure_product_attributes_from_listing(p)

        print("🔑 Product keys added")
        sys.stdout.flush()

        # ----------------------------
        # REMOVE DUPLICATES
        # ----------------------------
        unique_products = remove_duplicates(all_products)

        print(f"🧹 After duplicate removal: {len(unique_products)}")
        sys.stdout.flush()

        # ----------------------------
        # RANKING
        # ----------------------------
        ranked_products = rank_products(unique_products)

        print("📊 Ranking completed")
        sys.stdout.flush()

        # ----------------------------
        # ML PREDICTION — key from top listing only (never from search query)
        # ----------------------------
        product_key = resolve_canonical_product_key(ranked_products)

        try:
            prediction = get_price_prediction(product_key)
        except Exception as e:
            print("ML ERROR:", str(e))
            prediction = {
                "predictedPrice": 48000,
                "message": "fallback prediction"
            }

        # ----------------------------
        # FINAL LOG
        # ----------------------------
        end_time = time.time()

        print(f"✅ Completed in {round(end_time - start_time, 2)} sec")
        print("🚀 Sending response to Spring Boot\n")
        sys.stdout.flush()

        return {
            "products": ranked_products,
            "prediction": prediction
        }

    except Exception as e:
        print("❌ ERROR:", str(e))
        sys.stdout.flush()

        return {
            "products": [],
            "prediction": {"message": "error"}
        }

# ----------------------------
# PREDICT API
# ----------------------------
@router.get("/predict")
def predict(
    product_key: Optional[str] = None,
    product_name: Optional[str] = None,
    product: Optional[str] = None,
):
    """
    product_key: use as-is (preferred if client already has it).
    product_name: full listing title — key is derived via generate_product_key only in product_utils.
    product: legacy alias for product_name (listing title, not search keyword).
    """
    key = resolve_product_key_from_client(
        explicit_key=product_key,
        product_name=product_name,
        legacy_product=product,
    )

    print("🔮 Predict request key:", key or "(empty)")
    sys.stdout.flush()

    if not key:
        return {
            "predictedPrice": 0,
            "productKey": "",
            "message": "Provide product_key or product_name (full listing title)",
        }

    try:
        return get_price_prediction(key)
    except Exception as e:
        print("ML ERROR:", str(e))
        return {"predictedPrice": 0}