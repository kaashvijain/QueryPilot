from typing import List, Any, Optional
from fastapi import FastAPI, Depends, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import get_settings, Settings
from services.dataset_service import process_and_save_csv
from services.query_pipeline import run_query_pipeline, QueryPipelineResult, QueryResultsSchema
from db import get_dataset_full_schema

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


class ColumnSchema(BaseModel):
    name: str
    type: str


class DatasetSchemaResponse(BaseModel):
    dataset_id: str
    table_name: str
    row_count: int
    columns: List[ColumnSchema]


class QueryRequest(BaseModel):
    dataset_id: str
    question: str


class ChartMetadata(BaseModel):
    type: str  # bar, line, scatter, pie, kpi, table


class QueryResponse(BaseModel):
    dataset_id: str
    question: str
    sql: str
    explanation: str
    chart: ChartMetadata
    chart_type: str  # Kept for backward compatibility
    attempts: int
    results: QueryResultsSchema


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
    Validates CSV format, stores the file locally, and ingests it into DuckDB.
    """
    result = await process_and_save_csv(file)
    return result


@app.get("/api/dataset/{dataset_id}/schema", response_model=DatasetSchemaResponse)
def get_dataset_schema_endpoint(dataset_id: str):
    """
    Retrieve the DuckDB schema and metadata for an ingested dataset.
    """
    return get_dataset_full_schema(dataset_id)


@app.post("/api/query", response_model=QueryResponse)
def analyze_dataset_query(payload: QueryRequest):
    """
    Main QueryPilot natural language analytics endpoint.
    Orchestrates schema retrieval, prompt formatting, SQL generation, validation,
    DuckDB query execution, and automatic self-correction (up to 3 attempts).
    """
    pipeline_res: QueryPipelineResult = run_query_pipeline(
        dataset_id=payload.dataset_id,
        question=payload.question,
    )
    
    if not pipeline_res.success or not pipeline_res.results:
        raise HTTPException(
            status_code=400,
            detail=pipeline_res.error_message or "Failed to generate and execute SQL for the provided question.",
        )

    return QueryResponse(
        dataset_id=pipeline_res.dataset_id,
        question=pipeline_res.question,
        sql=pipeline_res.sql,
        explanation=pipeline_res.explanation,
        chart=ChartMetadata(type=pipeline_res.chart_type),
        chart_type=pipeline_res.chart_type,
        attempts=pipeline_res.attempts,
        results=pipeline_res.results,
    )
