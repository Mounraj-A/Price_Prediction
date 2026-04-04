import numpy as np
from xgboost import XGBRegressor

from ml.data_loader import load_price_data
from ml.deal_detection import detect_deal
from ml.notification_engine import generate_notification
from ml.trend_analysis import analyze_trend
from utils.prediction_cache import get_prediction_cache
from utils.product_utils import generate_standard_product_key

# ----------------------------
# Feature Engineering
# ----------------------------
def create_features(df):

    df = df.copy()

    df["time_index"] = range(len(df))
    df["lag1"] = df["price"].shift(1)
    df["lag2"] = df["price"].shift(2)
    df["ma3"] = df["price"].rolling(3).mean()

    df = df.dropna()

    return df


# ----------------------------
# Prediction Function
# ----------------------------
def _compute_price_prediction(product_key: str) -> dict:
    df = load_price_data(product_key)

    # Not enough raw data
    if df.empty or len(df) < 5:
        return {
            "currentPrice": 0,
            "predictedPrice": 0,
            "trend": "unknown",
            "message": "Not enough data",
            "productKey": product_key,
        }

    df = create_features(df)

    # Not enough processed data after lag/rolling
    if len(df) < 3:
        return {
            "currentPrice": 0,
            "predictedPrice": 0,
            "trend": "unknown",
            "message": "Not enough processed data",
            "productKey": product_key,
        }

    features = ["time_index", "lag1", "lag2", "ma3"]

    X = df[features]
    y = df["price"]

    model = XGBRegressor(
        n_estimators=50,
        learning_rate=0.1,
        max_depth=3,
        objective="reg:squarederror",
    )

    model.fit(X, y)

    last = df.iloc[-1]

    next_input = np.array(
        [
            [
                last["time_index"] + 1,
                last["price"],
                last["lag1"],
                df["price"].tail(3).mean(),
            ]
        ]
    )

    predicted = model.predict(next_input)[0]

    deal = detect_deal(product_key)
    trend = analyze_trend(product_key)
    notification = generate_notification(product_key)

    return {
        "currentPrice": float(last["price"]),
        "predictedPrice": round(float(predicted), 2),
        "trend": trend.get("trend", "unknown"),
        "deal": deal,
        "notifications": notification,
        "productKey": product_key,
    }


def get_price_prediction_for_product_name(product_name: str, use_cache: bool = True) -> dict:
    """
    Listing title → key via generate_product_key (utils.product_utils) only.
    Use when you have a productName string and no precomputed key.
    """
    key = generate_standard_product_key((product_name or "").strip())
    return get_price_prediction(key, use_cache)


def get_price_prediction(product_key: str, use_cache: bool = True) -> dict:
    """
    Product-key-based prediction with optional TTL cache so the same canonical_key
    always returns the same numbers within the cache window.
    """
    if not (product_key or "").strip():
        return {
            "currentPrice": 0,
            "predictedPrice": 0,
            "trend": "unknown",
            "message": "Missing product key",
            "productKey": "",
        }

    cache = get_prediction_cache()
    if use_cache:
        cached = cache.get(product_key)
        if cached is not None:
            out = dict(cached)
            out["cacheHit"] = True
            return out

    out = _compute_price_prediction(product_key)
    # Cache successful model outputs only (skip "not enough data" short-circuits)
    if use_cache and "message" not in out:
        cache.set(product_key, dict(out))
    out["cacheHit"] = False
    return out