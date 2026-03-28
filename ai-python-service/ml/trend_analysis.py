import numpy as np
from ml.data_loader import load_price_data


def analyze_trend(product_key):

    df = load_price_data(product_key)

    if df.empty or len(df) < 5:
        return {"trend": "unknown"}

    prices = df["price"].values

    slope = np.polyfit(range(len(prices)), prices, 1)[0]

    if slope < -10:
        return {"trend": "falling 📉"}
    elif slope > 10:
        return {"trend": "rising 📈"}
    else:
        return {"trend": "stable ➖"}