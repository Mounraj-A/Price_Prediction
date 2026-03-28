from xgboost import XGBRegressor


def train_model(df):

    features = [
        "day",
        "rolling_avg",
        "price_change",
        "price_volatility"
    ]

    X = df[features]
    y = df["price"]

    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )

    model.fit(X, y)

    return model