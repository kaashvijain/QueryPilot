# QueryPilot — AI-Powered Natural Language Analytics Platform

QueryPilot is an AI-powered data analytics platform that allows non-technical business users to ask natural language questions about structured CSV datasets. 

It translates natural-language questions into schema-aware, read-only SQL, validates queries for safety, executes them against an embedded DuckDB engine, automatically renders optimal data visualizations, generates plain-English insights, and self-corrects SQL execution errors using an automated LLM retry loop.

---

## Problem Statement

Non-technical users (business analysts, product managers, operations teams, startup founders) frequently have access to structured operational or sales datasets in CSV format but lack the SQL knowledge needed to extract insights.

Answering a simple question like *"Which 5 products generated the highest revenue last quarter?"* typically requires a user to:
1. Understand the underlying database schema and column names.
2. Master SQL syntax, aggregations (`SUM`, `AVG`), and `GROUP BY` logic.
3. Write, debug, and execute queries manually.
4. Export data into external tools to generate charts.
5. Interpret raw tables into plain-English business takeaways.

This creates a heavy dependency on data analysts for straightforward analytical questions.

---

## The QueryPilot Solution

QueryPilot acts as a natural-language analytics layer between non-technical users and their data:

```text
Natural Language Question  ──>  QueryPilot  ──>  Validated SQL  ──>  DuckDB  ──>  Chart + Business Insight
```

### Analyst-First Product Workflow

QueryPilot is designed around an analyst-first workflow that abstracts database complexity for non-technical users while maintaining complete transparency for technical users:

```text
Upload data  ──>  Ask a question  ──>  Get a grounded insight  ──>  Explore visualization & results  ──>  Inspect generated SQL
```

1. **Schema Awareness**: Automatically parses uploaded CSVs, infers column data types, and constructs schema context for the LLM.
2. **Schema-Aware Text-to-SQL**: Generates read-only DuckDB SQL queries without hallucinating nonexistent columns.
3. **Safety & Security Validation**: Validates generated SQL to block destructive operations (`DROP`, `DELETE`, `INSERT`, `ALTER`, etc.) and multi-statement queries before execution.
4. **Self-Correction Loop**: Catches database execution errors and automatically feeds DuckDB error tracebacks back to the LLM (up to 3 retries) to fix syntax or column mismatch errors.
5. **Deterministic Chart Selector**: Uses backend rule-based logic to determine optimal chart types (Bar, Line, Scatter, Pie, KPI Card, or Table), which the frontend renders using Recharts.
6. **Data-Grounded Insights**: Generates concise business explanations grounded strictly in query results without introducing unsupported facts.

---

## Key Features

- **CSV Dataset Ingestion**: Upload CSV datasets up to 50MB with instant row/column count detection and DuckDB storage.
- **Natural Language Querying**: Ask complex questions in plain English (aggregations, date filters, top-N, percentages, comparisons).
- **Automated Self-Correction**: Recovers from initial SQL generation errors in up to 3 automated retry attempts.
- **Deterministic Visualizations**: Backend rule engine selects optimal visualization formats rendered by Recharts in the UI.
- **Grounded AI Insights**: Concise 1–2 sentence analytical explanations attached to every result.
- **Query Safety & Security Controls**: Enforces read-only query policy, query execution timeout (10s), row limit capping (10,000 rows), and file path sanitization.
- **Empirical Evaluation Suite**: Includes a 50-question benchmark runner measuring accuracy, latency, token usage, and cost.
- **Docker & Docker Compose**: Full containerization for backend (FastAPI) and frontend (Next.js Standalone).

---

## Architecture

```text
                    ┌──────────────────────────┐
                    │      Next.js 16 UI       │
                    │   (React 19 / Recharts)  │
                    └────────────┬─────────────┘
                                 │ HTTP API
                                 ▼
                    ┌──────────────────────────┐
                    │     FastAPI Backend      │
                    └────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Schema Engine  │     │   LLM Service   │     │  SQL Validator  │
│  (DuckDB Meta)  │     │ (Gemini 3.6)    │     │ (Safety Check)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │      DuckDB Engine       │
                    │   (Analytical Queries)   │
                    └────────────┬─────────────┘
                                 │
                         Query Results Data
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │  Chart Selector  │            │ Insight Generator│
       │ (Rule Engine)    │            │  (Grounded AI)   │
       └──────────────────┘            └──────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript & React 19
- **Visualization**: Recharts & Lucide Icons
- **Styling**: Vanilla CSS Design System (CSS Variables, Responsive Design, Dark/Light Theme)

### Backend
- **Framework**: Python 3.11+ & FastAPI
- **Analytical Database**: DuckDB
- **AI / LLM Provider**: Google GenAI SDK (`gemini-3.6-flash`)
- **Validation & Parsing**: Pydantic v2 & `sqlglot` / Regex token parsing
- **Testing**: Pytest (78 unit & integration tests)

### Infrastructure & Operations
- **Containerization**: Docker (Multi-stage builds) & Docker Compose
- **Environment**: Python `pydantic-settings` & dotenv

---

## How It Works (Core User Journey)

```text
Upload CSV Dataset
        ↓
Schema Discovery (Detect columns, data types, & row count)
        ↓
Ask Natural-Language Question
        ↓
Generate & Validate SQL (Gemini 3.6 Flash & Safety Validator)
        ↓
     Valid? ──> NO ──> Self-Correction Loop (Send error + schema back to LLM, max 3 attempts)
        │
       YES
        ↓
Execute Analysis (DuckDB engine with 10s timeout & 10,000 max row limit)
        ↓
Select Visualization (Backend rule engine assigns Bar, Line, Scatter, Pie, KPI, or Table)
        ↓
Generate Grounded Insight (1-2 sentence data-grounded business summary)
        ↓
Explore Results (Interactive chart, result table, and collapsible generated SQL)
```

---

## Setup & Installation

### Prerequisites
- **Node.js**: v20+
- **Python**: v3.11+
- **Docker**: Docker Desktop (Optional for container setup)
- **Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/)

---

### Option A: Local Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/kaashvijain/QueryPilot.git
cd QueryPilot
```

#### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

Create a `backend/.env` file:
```ini
ENVIRONMENT=development
DEBUG=true
PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-3.6-flash
```

Start the FastAPI Backend:
```bash
uvicorn main:app --reload --port 8000
```
Backend API will be available at `http://localhost:8000`.

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will be available at `http://localhost:3000`.

---

### Option B: Docker Compose Setup (One Command)

You can launch both frontend and backend in production containers using Docker Compose:

```bash
# 1. Create backend/.env with your API key
echo "GEMINI_API_KEY=your_gemini_api_key_here" > backend/.env

# 2. Build and start containers
docker compose up -d
```

- **Frontend Application**: `http://localhost:3001`
- **Backend API**: `http://localhost:8001`

---

## API Overview

### 1. Upload Dataset
```http
POST /api/dataset
Content-Type: multipart/form-data
```
**Response (201 Created)**:
```json
{
  "dataset_id": "c72aba1a-a0e1-4e18-9d95-b402b08e5ae1",
  "filename": "sales.csv",
  "row_count": 9994,
  "column_count": 21
}
```

### 2. Get Dataset Schema
```http
GET /api/dataset/{dataset_id}/schema
```
**Response (200 OK)**:
```json
{
  "dataset_id": "c72aba1a-a0e1-4e18-9d95-b402b08e5ae1",
  "table_name": "dataset_c72aba1a_a0e1_4e18_9d95_b402b08e5ae1",
  "row_count": 9994,
  "columns": [
    { "name": "Category", "type": "VARCHAR" },
    { "name": "Sales", "type": "DOUBLE" },
    { "name": "Quantity", "type": "BIGINT" }
  ]
}
```

### 3. Analyze Question
```http
POST /api/query
Content-Type: application/json

{
  "dataset_id": "c72aba1a-a0e1-4e18-9d95-b402b08e5ae1",
  "question": "What are the top 5 products by revenue?"
}
```
**Response (200 OK)**:
```json
{
  "dataset_id": "c72aba1a-a0e1-4e18-9d95-b402b08e5ae1",
  "question": "What are the top 5 products by revenue?",
  "sql": "SELECT \"Product Name\", SUM(\"Sales\") AS revenue FROM \"dataset_c72aba1a_a0e1_4e18_9d95_b402b08e5ae1\" GROUP BY \"Product Name\" ORDER BY revenue DESC LIMIT 5",
  "explanation": "Calculates total revenue per product name and returns top 5.",
  "insight": "Canon imageCLASS Copier generated highest revenue of $61,599.82.",
  "chart": { "type": "bar" },
  "attempts": 1,
  "results": {
    "columns": ["Product Name", "revenue"],
    "rows": [["Canon imageCLASS 2200 Advanced Copier", 61599.82]],
    "row_count": 5,
    "execution_time_ms": 24.5
  }
}
```

---

## Query Safety & Security Controls

1. **Strict Read-Only Enforcement**: QueryPilot rejects any SQL statement containing destructive operations (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `CREATE`, `TRUNCATE`, `EXEC`, `INSTALL`, `LOAD`, `EXPORT`, `IMPORT`).
2. **Multi-Statement Blocking**: Rejects queries containing semicolons to prevent stacked SQL injection.
3. **Isolated Table Namespaces**: Uploaded datasets are assigned UUIDs (`dataset_<uuid>`) and loaded into isolated DuckDB tables.
4. **Path Sanitization**: `os.path.basename` sanitizes uploaded filenames to eliminate directory traversal risks.
5. **Execution Timeout Protection**: DuckDB queries are bound by `SET max_execution_time = '10s'` to prevent resource exhaustion.
6. **Result Set Capping**: Maximum returned rows are capped at 10,000 rows to prevent backend out-of-memory spikes.
7. **Server-Side API Key Security**: `GEMINI_API_KEY` is loaded exclusively on the backend; keys are never exposed to client JS bundles.

---

## Evaluation Methodology & Benchmark Results

QueryPilot includes an automated evaluation benchmark suite (`backend/eval/eval_runner.py`) that tests system accuracy, latency, token consumption, self-correction rate, and API costs across **50 analytical questions** spanning 10 query categories:

1. **Simple Aggregations** (Q01–Q05)
2. **Filtering & Predicates** (Q06–Q10)
3. **Sorting & Ordering** (Q11–Q15)
4. **GROUP BY Aggregations** (Q16–Q20)
5. **Date & Time Filtering** (Q21–Q25)
6. **Averages & Means** (Q26–Q30)
7. **Counts & Cardinality** (Q31–Q35)
8. **Top-N & Bottom-N Queries** (Q36–Q40)
9. **Percentage & Ratio Calculations** (Q41–Q45)
10. **Comparisons & Conditional Aggregations** (Q46–Q50)

### Measured Empirical Benchmark Results (50 Questions Evaluated)

| Metric | Measured Value | Description / Detail |
| :--- | :--- | :--- |
| **Total Benchmark Questions** | **50** | Evaluated across 10 analytical categories |
| **SQL Execution Success Rate** | **100.0%** | **50 / 50 queries executed successfully** |
| **First-Attempt Success Rate** | **100.0%** | **50 / 50 queries succeeded on 1st attempt** |
| **Self-Correction Rate** | **0.0%** | 0 queries required error retries |
| **Average Attempts per Query** | **1.0** | Perfect 1-shot generation |
| **Average Latency** | **686.2 ms** | Includes initial Q01 LLM cold-start retry; remaining 49 queries averaged ~28 ms |
| **P95 Latency** | **42.72 ms** | 95th percentile execution speed across all queries |
| **Total Token Consumption** | **23,500** | Total input (17,500) + output (6,000) tokens |
| **Estimated Total API Cost** | **$0.00311** | Total LLM cost for 50 analytical queries |

*Reports generated at [`backend/eval/evaluation_report.json`](backend/eval/evaluation_report.json) and [`backend/eval/evaluation_report.csv`](backend/eval/evaluation_report.csv).*

---

## Application Walkthrough

### 1. Dataset Upload & Ingestion
Upload CSV datasets with drag-and-drop support, file size validation (up to 50MB), instant row/column count detection, and automatic DuckDB schema inference.

### 2. Schema Explorer & Data Types
Inspect dataset table schemas, total row counts, column names, and inferred DuckDB data types (`VARCHAR`, `DOUBLE`, `BIGINT`, `DATE`).

### 3. Natural Language Analysis Workspace
Ask analytical business questions in plain English with real-time 4-stage visual loading progress indicators (Schema Context $\rightarrow$ SQL Translation $\rightarrow$ DuckDB Execution $\rightarrow$ Insight Generation).

### 4. Interactive Results, Visualizations, & SQL Transparency
View backend-determined visualizations (Bar, Line, Scatter, Pie, KPI Card, Table), data-grounded business insights, and collapsible generated SQL queries for complete technical transparency.

---

## Future Improvements (V2 / V3 Roadmap)

QueryPilot's roadmap is structured around three progressive milestones: making the analyst experience smarter, expanding data reasoning across multiple datasets, and connecting to real-world production data stores.

### V2 — Conversational & Schema Intelligence
- [ ] **Conversational Follow-Up Analysis**: Maintain thread context to support follow-up questions (*"Only show electronics"* or *"Compare that against last month"*).
- [ ] **Multi-Table CSV JOIN Support**: Auto-detect primary and foreign key relationships across multiple CSV files to generate multi-table JOIN queries.
- [ ] **Data Quality Assistant**: Automatically detect missing values, outliers, duplicate records, and inconsistent data types upon dataset upload.

### V3 — Enterprise Integrations & Export Capabilities
- [ ] **Database Connectors**: Connect directly to persistent data warehouses and SQL databases (PostgreSQL, MySQL, Snowflake, Google BigQuery).
- [ ] **Export Results**: Export query result tables directly as downloadable CSV or JSON files.

---

## License

This project is licensed under the [MIT License](LICENSE). See the [`LICENSE`](LICENSE) file for details.
