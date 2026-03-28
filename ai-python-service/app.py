from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ----------------------------
# Routers
# ----------------------------
from api.search_api import router as search_router
from api.price_api import router as price_router

# ----------------------------
# App Initialization
# ----------------------------
app = FastAPI(
    title="Omni Price AI Service",
    description="AI-powered multi-platform price comparison and prediction system",
    version="2.0.0"
)

# ----------------------------
# CORS (IMPORTANT)
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Include Routes
# ----------------------------
app.include_router(search_router, prefix="/api")
app.include_router(price_router, prefix="/api")

# ----------------------------
# Health Check
# ----------------------------
@app.get("/health")
def health():
    return {
        "status": "AI service running"
    }

# ----------------------------
# Root
# ----------------------------
@app.get("/")
def home():
    return {
        "message": "AI Service Running",
        "test_url": "http://127.0.0.1:8000/api/search?product=iphone 17"
    }

# ----------------------------
# Startup Debug
# ----------------------------
@app.on_event("startup")
def startup_event():
    print("🚀 FastAPI STARTED SUCCESSFULLY")