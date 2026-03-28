# utils/ranking_engine.py

def rank_products(products):

    if not products:
        return []

    price_weight = 0.6
    rating_weight = 0.4

    # Find lowest price for Best Deal detection
    valid_prices = []

    for p in products:
        try:
            price = float(p.get("price", 0))
            if price > 0:
                valid_prices.append(price)
        except:
            continue

    lowest_price = min(valid_prices) if valid_prices else None

    for p in products:

        # Safe price conversion
        try:
            price = float(p.get("price", 0))
        except:
            price = 0

        # Safe rating conversion
        try:
            rating = float(p.get("rating", 0))
        except:
            rating = 0

        # Price score (lower price = higher score)
        price_score = 1 / (price + 1)

        # Rating score normalized (out of 5)
        rating_score = rating / 5

        # Final ranking score
        p["score"] = (price_weight * price_score) + (rating_weight * rating_score)

        # Best deal detection
        p["isBestDeal"] = price == lowest_price

    # Sort products by highest score
    ranked = sorted(products, key=lambda x: x["score"], reverse=True)

    return ranked