import numpy as np


def create_features(df):

    df = df.copy()

    # Time index
    df["day"] = (df["date"] - df["date"].min()).dt.days

    # Rolling average (trend)
    df["rolling_avg"] = df["price"].rolling(window=3, min_periods=1).mean()

    # Price change (momentum)
    df["price_change"] = df["price"].diff().fillna(0)

    # Volatility (stability)
    df["price_volatility"] = df["price"].rolling(window=3).std().fillna(0)

    return df