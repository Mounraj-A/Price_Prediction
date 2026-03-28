from ml.data_loader import load_price_data


def check_price_drop(product_key):

    df = load_price_data(product_key)

    if df.empty or len(df) < 5:
        return None

    prices = df["price"].values

    current = prices[-1]
    previous = prices[-2]

    drop_percent = ((previous - current) / previous) * 100

    if drop_percent > 5:
        return {
            "alert": "PRICE DROP 🔥",
            "dropPercent": round(drop_percent, 2)
        }

    return None