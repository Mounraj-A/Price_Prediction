from typing import Optional

from fastapi import APIRouter
from ml.data_loader import load_price_data
from utils.product_utils import resolve_product_key_from_client

router = APIRouter()


@router.get("/price-history")
def get_price_history(
    product_key: Optional[str] = None,
    product_name: Optional[str] = None,
    product: Optional[str] = None,
):
    """
    product_key: lookup directly.
    product_name: full listing title — key derived only in product_utils.
    product: legacy alias for product_name.
    """
    key = resolve_product_key_from_client(
        explicit_key=product_key,
        product_name=product_name,
        legacy_product=product,
    )
    if not key:
        return {"data": []}

    df = load_price_data(key)

    if df.empty:
        return {"data": []}

    result = []

    for _, row in df.iterrows():
        result.append({
            "time": row["createdAt"].isoformat(),
            "price": float(row["price"])
        })

    return {"data": result}