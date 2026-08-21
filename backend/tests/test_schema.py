import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path for test discovery
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def use_isolated_db(monkeypatch, tmp_path):
    """Isolates DuckDB file per test execution to prevent file locking conflicts."""
    test_db = str(tmp_path / "test_schema.duckdb")
    monkeypatch.setattr("db.DEFAULT_DB_PATH", test_db)


def test_get_schema_success():
    """Test retrieving schema for an uploaded, ingested dataset."""
    csv_content = "product,quantity,unit_price,category\nLaptop,2,1200.00,Electronics\nMonitor,1,300.00,Electronics\n"
    files = {
        "file": ("products.csv", csv_content, "text/csv")
    }

    # 1. Upload CSV to generate dataset_id & DuckDB table
    upload_res = client.post("/api/dataset", files=files)
    assert upload_res.status_code == 201
    dataset_id = upload_res.json()["dataset_id"]

    # 2. Fetch schema via GET /api/dataset/{dataset_id}/schema
    schema_res = client.get(f"/api/dataset/{dataset_id}/schema")
    assert schema_res.status_code == 200

    data = schema_res.json()
    assert data["dataset_id"] == dataset_id
    assert "table_name" in data
    assert data["table_name"].startswith("dataset_")
    assert data["row_count"] == 2
    
    col_names = [col["name"] for col in data["columns"]]
    assert col_names == ["product", "quantity", "unit_price", "category"]
    
    col_types = {col["name"]: col["type"] for col in data["columns"]}
    assert "product" in col_types
    assert "quantity" in col_types
    assert "unit_price" in col_types


def test_get_schema_not_found():
    """Test requesting schema for a non-existent dataset ID returns HTTP 404."""
    response = client.get("/api/dataset/non-existent-uuid-99999/schema")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
