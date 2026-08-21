import os
import re
import duckdb
from typing import Optional, List, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "querypilot.duckdb")


def ensure_data_dir() -> str:
    """Ensures the backend/data directory exists and returns its path."""
    os.makedirs(DATA_DIR, exist_ok=True)
    return DATA_DIR


def get_table_name(dataset_id: str) -> str:
    """
    Generates a sanitized, isolated SQL table name for a dataset ID.
    Example: 'c72aba1a-a0e1-4e18-9d95-b402b08e5ae1' -> 'dataset_c72aba1a_a0e1_4e18_9d95_b402b08e5ae1'
    """
    clean_id = re.sub(r"[^a-zA-Z0-9_]", "_", dataset_id)
    return f"dataset_{clean_id}"


def get_db_connection(db_path: Optional[str] = None) -> duckdb.DuckDBPyConnection:
    """Returns a DuckDB connection to the database file or in-memory instance."""
    if db_path is None:
        ensure_data_dir()
        db_path = DEFAULT_DB_PATH
    return duckdb.connect(database=db_path, read_only=False)


def ingest_csv_to_duckdb(dataset_id: str, csv_file_path: str, db_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Loads a CSV file directly into DuckDB as an isolated table with auto-schema inference.
    Preserves column names and infers data types.
    """
    table_name = get_table_name(dataset_id)
    abs_csv_path = os.path.abspath(csv_file_path).replace("\\", "/")
    
    conn = get_db_connection(db_path)
    try:
        # Drop table if already existing for this dataset ID
        conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        
        # Load CSV into DuckDB with read_csv_auto
        query = f'CREATE TABLE "{table_name}" AS SELECT * FROM read_csv_auto(\'{abs_csv_path}\', header=True)'
        conn.execute(query)
        
        # Query row count
        count_res = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()
        row_count = count_res[0] if count_res else 0
        
        # Query column metadata (name and data type)
        describe_res = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        columns = [{"name": str(row[0]), "type": str(row[1])} for row in describe_res]
        
        return {
            "table_name": table_name,
            "row_count": row_count,
            "columns": columns,
        }
    finally:
        conn.close()


def get_dataset_columns(dataset_id: str, db_path: Optional[str] = None) -> List[Dict[str, str]]:
    """Retrieves column names and data types for an ingested dataset."""
    table_name = get_table_name(dataset_id)
    conn = get_db_connection(db_path)
    try:
        describe_res = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        return [{"name": str(row[0]), "type": str(row[1])} for row in describe_res]
    finally:
        conn.close()


def get_dataset_row_count(dataset_id: str, db_path: Optional[str] = None) -> int:
    """Retrieves total row count for an ingested dataset table in DuckDB."""
    table_name = get_table_name(dataset_id)
    conn = get_db_connection(db_path)
    try:
        count_res = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()
        return count_res[0] if count_res else 0
    finally:
        conn.close()


def query_dataset(dataset_id: str, sql_select: str, db_path: Optional[str] = None) -> Dict[str, Any]:
    """Executes a SQL query against the dataset table in DuckDB and returns columns + rows."""
    conn = get_db_connection(db_path)
    try:
        res = conn.execute(sql_select)
        cols = [desc[0] for desc in res.description] if res.description else []
        rows = res.fetchall()
        return {
            "columns": cols,
            "rows": [list(r) for r in rows],
        }
    finally:
        conn.close()
