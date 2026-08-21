import csv
import io
import os
import uuid
import logging
from fastapi import HTTPException, UploadFile
from db import ingest_csv_to_duckdb

logger = logging.getLogger("querypilot.dataset_service")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit


def ensure_upload_dir() -> str:
    """Ensures the upload directory exists and returns its absolute path."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    return UPLOAD_DIR


async def process_and_save_csv(file: UploadFile) -> dict:
    """
    Validates, parses, saves an uploaded CSV file, and ingests it into DuckDB.
    
    Returns:
        dict containing dataset_id, filename, row_count, column_count.
        
    Raises:
        HTTPException: If file is not a CSV, empty, exceeds 50MB limit, or malformed.
    """
    filename = os.path.basename(file.filename or "")
    
    # 1. Reject non-CSV file extensions
    if not filename.lower().endswith(".csv"):
        logger.warning(f"Rejected unsupported file upload: '{filename}'")
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .csv files are accepted.",
        )

    # 2. Read file bytes
    content_bytes = await file.read()
    if not content_bytes or len(content_bytes.strip()) == 0:
        logger.warning(f"Rejected empty file upload: '{filename}'")
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty. Please select a populated CSV file.",
        )

    # Reject files exceeding 50MB size limit
    if len(content_bytes) > MAX_FILE_SIZE_BYTES:
        logger.warning(f"Rejected oversized file upload: '{filename}' ({len(content_bytes)} bytes)")
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    # 3. Try decoding across common text encodings (UTF-8-SIG, UTF-8, UTF-16, CP1252, Latin-1)
    content_text = None
    encodings_to_try = ["utf-8-sig", "utf-8", "utf-16", "cp1252", "latin-1"]
    
    for encoding in encodings_to_try:
        try:
            text = content_bytes.decode(encoding)
            if text and ("\n" in text or "\r" in text or "," in text or "\t" in text):
                content_text = text
                break
        except (UnicodeDecodeError, LookupError):
            continue

    if content_text is None:
        logger.error(f"Failed to decode text encoding for uploaded file: '{filename}'")
        raise HTTPException(
            status_code=400,
            detail="Malformed file: File encoding is not valid text. Please save as UTF-8 CSV.",
        )

    # 4. Validate CSV structure using csv.reader
    try:
        # Detect delimiter if tab-separated or comma-separated
        first_line = content_text.splitlines()[0] if content_text.splitlines() else ""
        delimiter = "\t" if "\t" in first_line and "," not in first_line else ","
        
        stream = io.StringIO(content_text)
        reader = list(csv.reader(stream, delimiter=delimiter))
    except Exception as exc:
        logger.error(f"CSV parsing error for file '{filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV format. Please ensure your file is a valid CSV document.",
        )

    # Filter out completely empty trailing lines
    non_empty_rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not non_empty_rows:
        logger.warning(f"Uploaded CSV contains no non-empty rows: '{filename}'")
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV file contains no data or columns.",
        )

    header = non_empty_rows[0]
    column_count = len(header)

    # Retry with tab delimiter if single column detected but tabs exist
    if column_count <= 1 and "\t" in first_line:
        stream = io.StringIO(content_text)
        reader = list(csv.reader(stream, delimiter="\t"))
        non_empty_rows = [row for row in reader if any(cell.strip() for cell in row)]
        if non_empty_rows:
            header = non_empty_rows[0]
            column_count = len(header)

    if column_count == 0:
        logger.warning(f"Uploaded CSV header has 0 columns: '{filename}'")
        raise HTTPException(
            status_code=400,
            detail="Malformed CSV file: Header contains no valid column names.",
        )

    row_count = max(0, len(non_empty_rows) - 1)  # Exclude header row if present

    # 5. Save sanitized text to uploads folder normalized as UTF-8
    dataset_id = str(uuid.uuid4())
    upload_dir = ensure_upload_dir()
    file_path = os.path.join(upload_dir, f"{dataset_id}.csv")

    try:
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            f.write(content_text)
    except Exception as exc:
        logger.error(f"Failed to write uploaded dataset file to disk: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Server storage error while saving uploaded dataset. Please try again.",
        )

    # 6. Ingest into DuckDB as an isolated table with inferred schema
    try:
        duckdb_info = ingest_csv_to_duckdb(dataset_id, file_path)
        row_count = duckdb_info["row_count"]
        column_count = len(duckdb_info["columns"])
    except Exception as exc:
        logger.error(f"DuckDB ingestion failure for dataset '{dataset_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to load CSV dataset into analytical database. Please verify file integrity.",
        )

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "row_count": row_count,
        "column_count": column_count,
    }
