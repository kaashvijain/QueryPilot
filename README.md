# QueryPilot — AI-Powered Natural Language Analytics

QueryPilot is an AI-powered analytics platform that translates natural-language questions about structured datasets into safe, schema-aware SQL queries, executes them against DuckDB, visualizes the results, and provides clear data insights.

## Project Architecture

This monorepo is structured into two main applications:

```text
QueryPilot/
├── frontend/   # Next.js + TypeScript web application (UI & visualizations)
├── backend/    # Python + FastAPI application (SQL generation, validation & DuckDB)
└── README.md   # Project overview and setup guide
```

---

## How to Run

### 1. Backend Setup & Startup (FastAPI)

Navigate to the `backend/` directory:

```bash
cd backend
```

Create and activate a virtual environment (if not already done):

```bash
# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# On Linux/macOS:
python3 -m venv .venv
source .venv/bin/activate
```

Install requirements:

```bash
pip install -r requirements.txt
```

Run the backend server:

```bash
uvicorn main:app --reload --port 8000
```

The API server will be available at:
- **Base URL**: `http://localhost:8000`
- **Health Check**: `http://localhost:8000/health`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`

---

### 2. Frontend Setup & Startup (Next.js)

Navigate to the `frontend/` directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The frontend application will be available at `http://localhost:3000`.
