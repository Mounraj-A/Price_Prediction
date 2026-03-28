from fastapi import APIRouter
from ml.data_loader import load_price_data

router = APIRouter()


@router.get("/price-history")
def get_price_history(product: str):

    df = load_price_data(product)

    if df.empty:
        return {"data": []}

    result = []

    for _, row in df.iterrows():
        result.append({
            "time": row["createdAt"].isoformat(),
            "price": float(row["price"])
        })

    return {"data": result}