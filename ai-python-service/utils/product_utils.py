import re


# ----------------------------
# NORMALIZE NAME
# ----------------------------
def normalize_name(title: str) -> str:
    if not title:
        return ""

    return re.sub(r'[^a-z0-9 ]', '', title.lower()).strip()


# ----------------------------
# 🔥 STRICT VALID PRODUCT FILTER
# ----------------------------
def is_valid_product(title: str) -> bool:
    if not title:
        return False

    title = title.lower()

    # ❌ remove accessories
    if any(x in title for x in [
        "case", "cover", "charger", "cable",
        "tempered", "glass", "protector"
    ]):
        return False

    # ❌ remove junk variants
    if any(x in title for x in [
        "refurbished", "used", "renewed",
        "pre-owned", "locked"
    ]):
        return False

    return True


# ----------------------------
# 🔥 PRODUCT KEY (MODEL LEVEL)
# ----------------------------
def generate_product_key(title: str) -> str:
    if not title:
        return ""

    title = title.lower()

    # iPhone → "iphone 17"
    match = re.search(r'(iphone\s?\d+)', title)
    if match:
        return match.group(1).strip()

    # Samsung → "samsung galaxy s25"
    match = re.search(r'(samsung\s?galaxy\s?[a-z0-9]+)', title)
    if match:
        return match.group(1).strip()

    # fallback
    normalized = normalize_name(title)
    return " ".join(normalized.split()[:2])


# ----------------------------
# 🔥 VARIANT NORMALIZER (NEW 🔥)
# ----------------------------
def normalize_variant(title: str) -> str:
    """
    Removes color, storage, extra noise
    Keeps only model-level identity
    """

    title = normalize_name(title)

    # remove storage
    title = re.sub(r'\b(64|128|256|512|1tb)\s?gb\b', '', title)

    # remove colors
    colors = [
        "black", "white", "blue", "green", "red",
        "pink", "gold", "silver", "purple",
        "lavender", "midnight", "starlight"
    ]

    for c in colors:
        title = title.replace(c, "")

    # clean extra spaces
    return " ".join(title.split())


# ----------------------------
# 🔥 BRAND EXTRACTION
# ----------------------------
def extract_brand(title: str) -> str:
    if not title:
        return ""

    title = title.lower()

    if "iphone" in title:
        return "Apple"
    if "samsung" in title:
        return "Samsung"
    if "oneplus" in title:
        return "OnePlus"
    if "xiaomi" in title or "redmi" in title:
        return "Xiaomi"

    return title.split(" ")[0].capitalize()