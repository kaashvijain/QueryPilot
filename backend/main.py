from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import get_settings, Settings
from services.dataset_service import process_and_save_csv

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Natural Language Analytics Backend API",
    version="0.1.0",
    debug=settings.debug,
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DatasetUploadResponse(BaseModel):
    dataset_id: str
    filename: str
    row_count: int
    column_count: int


@app.get("/")
def read_root(config: Settings = Depends(get_settings)):
    return {
        "name": config.app_name,
        "version": "0.1.0",
        "environment": config.environment,
        "status": "online",
        "llm_configured": bool(config.gemini_api_key),
        "llm_model": config.llm_model,
    }


@app.get("/health")
def health_check(config: Settings = Depends(get_settings)):
    return {
        "status": "ok",
        "environment": config.environment,
    }


@app.post("/api/dataset", response_model=DatasetUploadResponse, status_code=201)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a CSV dataset.
    Validates CSV format, stores the file locally, and returns dataset metadata.
    """
    result = await process_and_save_csv(file)
    return result
