# ml/deal_detection.py

import numpy as np
from ml.data_loader import load_price_data


def detect_deal(product_key):

    df = load_price_data(product_key)

    if df.empty or len(df) < 5:
        return {
            "decision": "NO DATA",
            "confidence": "low"
        }

    prices = df["price"].values

    current_price = prices[-1]
    avg_price = np.mean(prices)
    min_price = np.min(prices)
    max_price = np.max(prices)

    # ----------------------------
    # 🔥 DEAL LOGIC
    # ----------------------------

    # 🟢 BEST DEAL
    if current_price <= min_price * 1.05:
        return {
            "decision": "BUY NOW 🔥",
            "reason": "Price is near historical low",
            "confidence": "high"
        }

    # 🔻 GOOD DEAL
    elif current_price < avg_price * 0.95:
        return {
            "decision": "GOOD DEAL ✅",
            "reason": "Below average price",
            "confidence": "medium"
        }

    # 🔺 OVERPRICED
    elif current_price > avg_price * 1.1:
        return {
            "decision": "WAIT ⏳",
            "reason": "Price higher than normal",
            "confidence": "high"
        }

    # ⚖️ NORMAL
    else:
        return {
            "decision": "MONITOR 👀",
            "reason": "Price is stable",
            "confidence": "medium"
        }