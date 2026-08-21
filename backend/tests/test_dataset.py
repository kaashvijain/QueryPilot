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
    """Isolates DuckDB file per test module execution to prevent file locks."""
    test_db = str(tmp_path / "test_dataset.duckdb")
    monkeypatch.setattr("db.DEFAULT_DB_PATH", test_db)


def test_upload_valid_csv():
    """Test uploading a valid CSV file."""
    csv_content = "customer_id,product,quantity,unit_price\n101,Laptop,2,1200.00\n102,Monitor,1,300.00\n103,Keyboard,5,50.00\n"
    files = {
        "file": ("sales.csv", csv_content, "text/csv")
    }

    response = client.post("/api/dataset", files=files)
    assert response.status_code == 201
    
    data = response.json()
    assert "dataset_id" in data
    assert len(data["dataset_id"]) > 0
    assert data["filename"] == "sales.csv"
    assert data["row_count"] == 3
    assert data["column_count"] == 4


def test_upload_invalid_file_type():
    """Test uploading a file with non-CSV extension (e.g. .txt)."""
    text_content = "This is a plain text file, not a CSV."
    files = {
        "file": ("document.txt", text_content, "text/plain")
    }

    response = client.post("/api/dataset", files=files)
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


def test_upload_malformed_csv():
    """Test uploading a malformed binary / non-UTF8 file."""
    malformed_bytes = b"\x80\x81\x82\x83\xff\xfe\xfd"
    files = {
        "file": ("corrupt.csv", malformed_bytes, "text/csv")
    }

    response = client.post("/api/dataset", files=files)
    assert response.status_code == 400
    assert "Malformed" in response.json()["detail"]


def test_upload_empty_csv():
    """Test uploading an empty 0-byte CSV file."""
    empty_content = ""
    files = {
        "file": ("empty.csv", empty_content, "text/csv")
    }

    response = client.post("/api/dataset", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_file_exceeds_size_limit(monkeypatch):
    """Test uploading a file exceeding max size limit returns HTTP 413 Payload Too Large."""
    monkeypatch.setattr("services.dataset_service.MAX_FILE_SIZE_BYTES", 50)
    large_content = "column1,column2\n" + ("x" * 100)
    files = {
        "file": ("large.csv", large_content, "text/csv")
    }

    response = client.post("/api/dataset", files=files)
    assert response.status_code == 413
    assert "exceeds" in response.json()["detail"].lower()
