import os
import re

import pandas as pd
from pymongo import MongoClient

# Must match Spring Boot spring.mongodb.database (see application.properties)
_MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
_MONGO_DB = os.getenv("MONGODB_DATABASE", "omni_price_db")

client = MongoClient(_MONGO_URI)
db = client[_MONGO_DB]


def load_price_data(product_key):
    product_key = (product_key or "").strip()
    if not product_key:
        return pd.DataFrame()

    data = list(db["price_history"].find({"productKey": product_key}))

    # Back-compat: legacy keys sometimes included RAM: brand_model_8gb_128gb
    if not data:
        parts = product_key.split("_")
        if len(parts) >= 3 and parts[-1].lower().endswith(("gb", "tb")):
            brand = parts[0]
            model = parts[1]
            storage = parts[-1]
            # Match either brand_model_storage or brand_model_<ram>_storage
            rx = rf"^{re.escape(brand)}_{re.escape(model)}(?:_\d+gb)?_{re.escape(storage)}$"
            data = list(db["price_history"].find({"productKey": {"$regex": rx}}))

    df = pd.DataFrame(data)

    if df.empty:
        return df

    # ✅ Handle timestamp safely
    if "createdAt" in df.columns:
        df["createdAt"] = pd.to_datetime(df["createdAt"])
    else:
        print("❌ createdAt missing")
        return pd.DataFrame()

    # ----------------------------
    # 🔥 REMOVE FAKE / NOISY PRICES
    # ----------------------------

    # remove extreme values
    df = df[(df["price"] > 7000) & (df["price"] < 100000)]

    # remove outliers using IQR
    Q1 = df["price"].quantile(0.25)
    Q3 = df["price"].quantile(0.75)
    IQR = Q3 - Q1

    df = df[
        (df["price"] >= Q1 - 1.5 * IQR) &
        (df["price"] <= Q3 + 1.5 * IQR)
    ]

    # ----------------------------
    # SORT TIME
    # ----------------------------
    df = df.sort_values("createdAt")

    print("✅ Cleaned ML data:", len(df))

    return df