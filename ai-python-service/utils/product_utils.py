import re
from typing import Any, Dict, Optional, Tuple
from urllib.parse import unquote

# ----------------------------
# NORMALIZE NAME
# ----------------------------
def normalize_name(title: str) -> str:
    if not title:
        return ""

    return re.sub(r"[^a-z0-9 ]", "", title.lower()).strip()


# ----------------------------
# STRICT VALID PRODUCT FILTER
# ----------------------------
def is_valid_product(title: str) -> bool:
    if not title:
        return False

    title = title.lower()

    if any(
        x in title
        for x in [
            "case",
            "cover",
            "charger",
            "cable",
            "tempered",
            "glass",
            "protector",
        ]
    ):
        return False

    if any(
        x in title
        for x in [
            "refurbished",
            "used",
            "renewed",
            "pre-owned",
            "locked",
        ]
    ):
        return False

    return True


# ---------------------------------------------------------------------------
# Variant-aware product key: brand_model_storage
# ---------------------------------------------------------------------------

# Multi-word colors / finishes first (longest match wins when iterating sorted by len)
_COLOR_TERMS = frozenset(
    {
        "space gray",
        "space grey",
        "midnight black",
        "phantom black",
        "titanium",
        "starlight",
        "midnight",
        "lavender",
        "graphite",
        "sierra blue",
        "deep purple",
        "natural titanium",
        "desert titanium",
        "rose gold",
        "product red",
        "obsidian",
        "volcanic",
        "arctic",
        "glacier",
    }
)

_COLOR_WORDS = frozenset(
    {
        "black",
        "white",
        "blue",
        "green",
        "red",
        "pink",
        "gold",
        "silver",
        "purple",
        "lavender",
        "yellow",
        "orange",
        "brown",
        "beige",
        "cream",
        "coral",
        "grey",
        "gray",
        "charcoal",
        "bronze",
        "copper",
        "navy",
        "teal",
        "mint",
        "lime",
        "burgundy",
        "maroon",
        "sand",
        "pearl",
        "ceramic",
        "phantom",
        "mystic",
        "cloud",
        "sunrise",
        "dawn",
        "dusk",
        "aqua",
        "frost",
        "ice",
        "jet",
        "onyx",
        "slate",
        "stone",
        "tan",
        "wine",
    }
)

_MARKETING_NOISE = frozenset(
    {
        "new",
        "latest",
        "original",
        "authentic",
        "genuine",
        "buy",
        "online",
        "india",
        "indian",
        "free",
        "shipping",
        "delivery",
        "warranty",
        "year",
        "years",
        "certified",
        "global",
        "version",
        "edition",
        "special",
        "limited",
        "combo",
        "pack",
        "offer",
        "deal",
        "sale",
        "discount",
        "imported",
        "with",
        "without",
        "only",
        "mobile",
        "smartphone",
        "phone",
        "cellular",
        "dual",
        "sim",
        "esim",
        "unlocked",
        "factory",
        "sealed",
        "box",
        "retail",
        "best",
        "price",
        "stock",
        "ready",
        "ship",
        "fast",
    }
)

# Order: specific multi-word brands before single tokens
_BRAND_SCAN_PATTERNS: Tuple[Tuple[str, str], ...] = (
    (r"\bone\s*plus\b", "oneplus"),
    (r"\boneplus\b", "oneplus"),
    (r"\bsamsung\b", "samsung"),
    (r"\bgalaxy\b", "samsung"),
    (r"\bgoogle\b", "google"),
    (r"\bpixel\b", "google"),
    (r"\bxiaomi\b", "xiaomi"),
    (r"\bredmi\b", "redmi"),
    (r"\bpoco\b", "poco"),
    (r"\brealme\b", "realme"),
    (r"\boppo\b", "oppo"),
    (r"\bvivo\b", "vivo"),
    (r"\bmotorola\b", "motorola"),
    (r"\bmoto\b", "motorola"),
    (r"\bnothing\b", "nothing"),
    (r"\bhonor\b", "honor"),
    (r"\basus\b", "asus"),
    (r"\brog\b", "asus"),
    (r"\bapple\b", "apple"),
)

# First token might be brand when no rule matched
_KNOWN_FIRST_TOKEN_BRANDS = frozenset(
    {
        "apple",
        "samsung",
        "google",
        "xiaomi",
        "redmi",
        "poco",
        "realme",
        "oppo",
        "vivo",
        "oneplus",
        "motorola",
        "nothing",
        "honor",
        "asus",
        "nokia",
        "sony",
        "lg",
        "htc",
    }
)

_STORAGE_PATTERNS: Tuple[Tuple[re.Pattern, str], ...] = (
    # 1 TB variants
    (re.compile(r"\b1\s*(?:tb|tera(?:byte)?)\b", re.I), "1tb"),
    # Phone storage GB (exclude typical RAM-only lines like "8 GB RAM")
    (
        re.compile(
            r"\b(32|64|128|256|512|1024)\s*(?:gb|g)\b(?!\s*(?:ram|ddr|memory))",
            re.I,
        ),
        "gb_group",
    ),
)


def _compact_segment(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _normalize_key_input(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _remove_match_span(text: str, m: re.Match) -> str:
    a, b = m.span()
    return re.sub(r"\s+", " ", (text[:a] + " " + text[b:])).strip()


def _extract_storage(s: str) -> Tuple[Optional[str], str]:
    """Return (normalized storage token, string with storage phrase removed)."""
    text = s
    for rx, kind in _STORAGE_PATTERNS:
        m = rx.search(text)
        if not m:
            continue
        if kind == "gb_group":
            token = f"{m.group(1)}gb"
        else:
            token = kind
        return token, _remove_match_span(text, m)
    return None, text


def _strip_color_terms(s: str) -> str:
    text = f" {s} "
    for phrase in sorted(_COLOR_TERMS, key=len, reverse=True):
        text = re.sub(
            rf"\b{re.escape(phrase)}\b",
            " ",
            text,
            flags=re.I,
        )
    for w in sorted(_COLOR_WORDS, key=len, reverse=True):
        text = re.sub(rf"\b{re.escape(w)}\b", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def _strip_marketing(s: str) -> str:
    text = f" {s} "
    for w in sorted(_MARKETING_NOISE, key=len, reverse=True):
        text = re.sub(rf"\b{re.escape(w)}\b", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def _infer_brand_and_model(core: str) -> Tuple[str, str]:
    """
    Infer brand slug and model substring from text (storage and colors already removed).
    Model keeps full lineage (e.g. 'iphone 15 pro max', 'galaxy s23 ultra').
    """
    s = core.strip()
    if not s:
        return "", ""

    sl = s.lower()

    # Apple: never drop 'iphone' / 'ipad' from model segment
    if re.search(r"\biphone\b", sl) or re.search(r"\bipad\b", sl) or re.search(r"\bairpods\b", sl):
        rem = re.sub(r"^apple\s+", "", sl, flags=re.I).strip()
        return "apple", rem

    if sl.startswith("apple ") or sl == "apple":
        rem = re.sub(r"^apple\s+", "", sl, flags=re.I).strip()
        return "apple", rem

    for pattern, brand_slug in _BRAND_SCAN_PATTERNS:
        if not re.search(pattern, sl, re.I):
            continue
        rem = sl
        if brand_slug == "samsung":
            rem = re.sub(r"^samsung\s+", "", rem, flags=re.I)
        elif brand_slug == "google":
            rem = re.sub(r"^google\s+", "", rem, flags=re.I)
        elif brand_slug == "xiaomi":
            rem = re.sub(r"^xiaomi\s+", "", rem, flags=re.I)
        elif brand_slug == "oneplus":
            rem = re.sub(r"^oneplus\s+", "", rem, flags=re.I)
            rem = re.sub(r"^one\s+plus\s+", "", rem, flags=re.I)
        elif brand_slug == "motorola":
            rem = re.sub(r"^motorola\s+", "", rem, flags=re.I)
            rem = re.sub(r"^moto\s+", "", rem, flags=re.I)
        elif brand_slug == "apple":
            rem = re.sub(r"^apple\s+", "", rem, flags=re.I)
        elif brand_slug == "asus":
            rem = re.sub(r"^asus\s+", "", rem, flags=re.I)
        elif brand_slug == "redmi":
            rem = re.sub(r"^redmi\s+", "", rem, flags=re.I)
        elif brand_slug == "poco":
            rem = re.sub(r"^poco\s+", "", rem, flags=re.I)
        elif brand_slug == "realme":
            rem = re.sub(r"^realme\s+", "", rem, flags=re.I)
        elif brand_slug == "oppo":
            rem = re.sub(r"^oppo\s+", "", rem, flags=re.I)
        elif brand_slug == "vivo":
            rem = re.sub(r"^vivo\s+", "", rem, flags=re.I)
        elif brand_slug == "nothing":
            rem = re.sub(r"^nothing\s+", "", rem, flags=re.I)
        elif brand_slug == "honor":
            rem = re.sub(r"^honor\s+", "", rem, flags=re.I)
        return brand_slug, rem.strip()

    parts = s.split()
    if parts and parts[0].lower() in _KNOWN_FIRST_TOKEN_BRANDS:
        return parts[0].lower(), " ".join(parts[1:])

    if parts:
        return parts[0].lower(), " ".join(parts[1:])

    return "", s


def generate_product_key(title: str) -> str:
    """
    Build a variant-aware key: brand_model_storage
    - Storage omitted when not present in the title.
    - Model is the full product line (incl. Pro / Max / Ultra) with colors/marketing stripped.
    """
    if not title:
        return ""

    s = _normalize_key_input(title)

    storage_token, s = _extract_storage(s)
    s = _strip_color_terms(s)
    s = _strip_marketing(s)

    brand, model_rest = _infer_brand_and_model(s)

    brand_c = _compact_segment(brand)
    model_c = _compact_segment(model_rest)

    if not brand_c and model_c:
        # No brand inferred; treat entire remainder as model only
        model_c = _compact_segment(s)

    parts = [p for p in (brand_c, model_c) if p]
    if not parts:
        return _compact_segment(s) or ""

    key = "_".join(parts)
    if storage_token:
        key = f"{key}_{storage_token}"
    return key


def ensure_product_attributes_from_listing(product: Dict[str, Any]) -> None:
    """
    Set normalizedName and productKey from productName only.
    Single place that assigns productKey from listing data (not search query).
    """
    name = (product.get("productName") or "").strip()
    if not product.get("normalizedName"):
        product["normalizedName"] = normalize_name(name)
    product["productKey"] = generate_product_key(name)


def resolve_product_key_from_client(
    explicit_key: Optional[str] = None,
    product_name: Optional[str] = None,
    legacy_product: Optional[str] = None,
) -> str:
    """
    For /predict and /price-history: use precomputed product_key if provided,
    else derive from product_name (full listing title). legacy_product is the old
    query param name `product` — must be a listing title, not a search keyword.

    Never pass a bare search query here when a listing title is available.
    """
    ek = (explicit_key or "").strip()
    if ek:
        return ek
    raw = (product_name or legacy_product or "").strip()
    if not raw:
        return ""
    return generate_product_key(unquote(raw))


# ----------------------------
# CANONICAL KEY FOR PREDICTIONS (search pipeline only)
# ----------------------------
def resolve_canonical_product_key(ranked_products: list) -> str:
    """
    Use the top-ranked listing's product_key (already set from productName).
    If missing, derive from that row's productName only — never from the search query.
    """
    if not ranked_products:
        return ""
    first = ranked_products[0]
    k = (first.get("productKey") or "").strip()
    if k:
        return k
    name = (first.get("productName") or "").strip()
    return generate_product_key(name) if name else ""


# ----------------------------
# VARIANT NORMALIZER
# ----------------------------
def normalize_variant(title: str) -> str:
    """
    Removes color, storage, extra noise
    Keeps only model-level identity
    """

    title = normalize_name(title)

    title = re.sub(r"\b(64|128|256|512|1tb)\s?gb\b", "", title)

    colors = [
        "black",
        "white",
        "blue",
        "green",
        "red",
        "pink",
        "gold",
        "silver",
        "purple",
        "lavender",
        "midnight",
        "starlight",
    ]

    for c in colors:
        title = title.replace(c, "")

    return " ".join(title.split())


# ----------------------------
# BRAND EXTRACTION (display / UI)
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
