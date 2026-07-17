import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure backend package is on path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.api.routers import auth, company_router, document_router, engine_router

# Load dotenv explicitly from backend directory
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="Corporate Insurance Recommendation & Premium Estimation System API",
    description="Enterprise API for extracting financials and assessing corporate insurance opportunities.",
    version="1.0.0"
)

# CORS configurations
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix="/api")
app.include_router(company_router.router, prefix="/api")
app.include_router(document_router.router, prefix="/api")
app.include_router(engine_router.router, prefix="/api")

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "Corporate Insurance & Premium API",
        "version": "1.0.0",
        "docs": "/docs"
    }
