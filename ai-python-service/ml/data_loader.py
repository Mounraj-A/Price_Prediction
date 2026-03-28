from pymongo import MongoClient
import pandas as pd

client = MongoClient("mongodb://localhost:27017/")
db = client["test"]


def load_price_data(product_key):

    data = list(db["price_history"].find({"productKey": product_key}))

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