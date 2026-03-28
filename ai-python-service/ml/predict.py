import numpy as np


def predict_future(df, model, days_ahead=1):

    last_row = df.iloc[-1]

    future_day = last_row["day"] + days_ahead

    input_data = np.array([[
        future_day,
        last_row["rolling_avg"],
        last_row["price_change"],
        last_row["price_volatility"]
    ]])

    prediction = model.predict(input_data)

    return float(prediction[0])