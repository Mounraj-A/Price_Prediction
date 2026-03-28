from pydantic import BaseModel

class Product(BaseModel):

    productName: str
    platform: str
    price: float
    rating: float
    brand: str
    offer: str
    link: str
    image: str