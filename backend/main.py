from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="QueryPilot API",
    description="AI-Powered Natural Language Analytics Backend API",
    version="0.1.0",
)

# Enable CORS for local Next.js frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "name": "QueryPilot API",
        "version": "0.1.0",
        "status": "online",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
