import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import logging
from classifier import classify_grievance
from deduplicator import check_duplicate

app = FastAPI(title="Grievance AI Microservice")

# Configure CORS (allow frontend domains in production)
origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
]

deployed_origin = os.environ.get("FRONTEND_URL")
if deployed_origin:
    origins.append(deployed_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyRequest(BaseModel):
    text: str
    image_url: Optional[str] = None

class ClassifyResponse(BaseModel):
    category: str
    departments: List[str]
    confidence: float
    is_duplicate: bool
    duplicate_of_id: Optional[str]
    urgency_score: int

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/classify", response_model=ClassifyResponse)
async def classify_endpoint(req: ClassifyRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    try:
        # 1. Classification & Urgency
        classification_result = classify_grievance(req.text, req.image_url)
        
        # 2. Deduplication (find similar recent issues in same category)
        dup_info = check_duplicate(req.text, classification_result["category"])
        
        return ClassifyResponse(
            category=classification_result["category"],
            departments=classification_result["departments"],
            confidence=classification_result["confidence"],
            urgency_score=classification_result["urgency_score"],
            is_duplicate=dup_info["is_duplicate"],
            duplicate_of_id=dup_info["duplicate_of_id"]
        )
    except Exception as e:
        logging.error(f"Error classifying grievance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
