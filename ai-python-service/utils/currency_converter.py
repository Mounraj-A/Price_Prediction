USD_TO_INR = 83


def convert_price_to_inr(price, source=None):

    if price is None:
        return 0

    try:
        price_str = str(price).strip()

        # Remove commas
        price_str = price_str.replace(",", "")

        # If price has ₹ symbol (Flipkart, Amazon)
        if "₹" in price_str:
            numeric_price = float(price_str.replace("₹", "").strip())
            return round(numeric_price, 2)

        # If price has $ symbol (eBay, Walmart, Google)
        if "$" in price_str:
            usd_value = float(price_str.replace("$", "").strip())
            return round(usd_value * USD_TO_INR, 2)

        # Source-based detection
        if source and source.lower() in ["flipkart", "amazon"]:
            # These sources typically return INR prices
            numeric = float(price_str)
            return round(numeric, 2)
        
        if source and source.lower() in ["ebay", "walmart", "google"]:
            # These sources typically return USD prices
            numeric = float(price_str)
            return round(numeric * USD_TO_INR, 2)

        # Heuristic: If numeric < 10000, likely USD; otherwise INR
        numeric = float(price_str)
        if numeric < 10000:
            # Likely USD from international platforms
            return round(numeric * USD_TO_INR, 2)
        else:
            # Likely INR from Indian platforms
            return round(numeric, 2)

    except Exception as e:
        return 0