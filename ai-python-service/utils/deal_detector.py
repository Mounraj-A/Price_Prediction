def detect_best_deal(products):

    best_product = None
    best_score = 0

    for p in products:

        price = float(p.get("price",0))
        rating = float(p.get("rating",0))
        reviews = float(p.get("reviews",0))

        price_score = 1/(price+1)
        rating_score = rating/5
        review_score = reviews/1000

        score = (0.5*price_score)+(0.3*rating_score)+(0.2*review_score)

        if score > best_score:
            best_score = score
            best_product = p

    return best_product