import numpy as np
from xgboost import XGBRegressor

from ml.data_loader import load_price_data
from ml.deal_detection import detect_deal
from ml.notification_engine import generate_notification
from ml.trend_analysis import analyze_trend

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
def get_price_prediction(product_key):

    df = load_price_data(product_key)

    # Not enough raw data
    if df.empty or len(df) < 5:
        return {
            "currentPrice": 0,
            "predictedPrice": 0,
            "trend": "unknown",
            "message": "Not enough data"
        }

    df = create_features(df)

    # Not enough processed data after lag/rolling
    if len(df) < 3:
        return {
            "currentPrice": 0,
            "predictedPrice": 0,
            "trend": "unknown",
            "message": "Not enough processed data"
        }

    features = ["time_index", "lag1", "lag2", "ma3"]

    X = df[features]
    y = df["price"]

    # ----------------------------
    # Model (XGBoost)
    # ----------------------------
    model = XGBRegressor(
        n_estimators=50,
        learning_rate=0.1,
        max_depth=3,
        objective="reg:squarederror"
    )

    model.fit(X, y)

    # ----------------------------
    # Predict next price
    # ----------------------------
    last = df.iloc[-1]

    next_input = np.array([[
        last["time_index"] + 1,      # next time index
        last["price"],               # lag1
        last["lag1"],                # lag2
        df["price"].tail(3).mean()   # moving average
    ]])

    predicted = model.predict(next_input)[0]

    deal = detect_deal(product_key)
    trend = analyze_trend(product_key)
    notification = generate_notification(product_key)

    return {
    "currentPrice": float(last["price"]),
    "predictedPrice": round(float(predicted), 2),
    "trend": trend,
    "deal": deal,
    "notifications": notification
}