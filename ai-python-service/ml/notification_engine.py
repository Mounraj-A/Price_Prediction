from ml.deal_detection import detect_deal
from ml.alert_system import check_price_drop
from ml.trend_analysis import analyze_trend


def generate_notification(product_key):

    deal = detect_deal(product_key)
    alert = check_price_drop(product_key)
    trend = analyze_trend(product_key)

    messages = []

    if deal:
        messages.append(deal["decision"])

    if alert:
        messages.append(alert["alert"])

    if trend:
        messages.append(f"Trend: {trend['trend']}")

    return {
        "notifications": messages
    }