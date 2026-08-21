import json
import time
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.query_pipeline import run_query_pipeline
from db import load_csv_into_duckdb

BENCHMARK_JSON_PATH = Path(__file__).parent / "evaluation_benchmark.json"

def run_evaluation_benchmark(dataset_id: str = "sample_superstore", db_path: str = None) -> Dict[str, Any]:
    """
    Executes the 50 evaluation benchmark questions and measures accuracy, correction rate, latency, and token metrics.
    """
    if not BENCHMARK_JSON_PATH.exists():
        raise FileNotFoundError(f"Benchmark file not found: {BENCHMARK_JSON_PATH}")

    with open(BENCHMARK_JSON_PATH, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    print(f"\n=======================================================")
    print(f"🚀 RUNNING QUERYPILOT EVALUATION BENCHMARK ({len(questions)} QUESTIONS)")
    print(f"=======================================================\n")

    results = []
    successful_queries = 0
    queries_requiring_correction = 0
    total_attempts = 0
    latencies_ms = []

    for idx, q in enumerate(questions, 1):
        q_id = q["id"]
        q_text = q["question"]
        category = q["category"]

        print(f"[{idx}/{len(questions)}] [{q_id}] ({category}) Question: '{q_text}'")

        start_time = time.perf_counter()
        pipeline_res = run_query_pipeline(
            dataset_id=dataset_id,
            question=q_text,
            db_path=db_path,
            max_attempts=3,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        latencies_ms.append(elapsed_ms)

        total_attempts += pipeline_res.attempts
        if pipeline_res.attempts > 1 and pipeline_res.success:
            queries_requiring_correction += 1

        if pipeline_res.success:
            successful_queries += 1
            print(f"   ✅ SUCCESS ({pipeline_res.attempts} attempt/s, {elapsed_ms:.1f}ms, chart: {pipeline_res.chart_type})")
        else:
            print(f"   ❌ FAILED ({pipeline_res.attempts} attempts, error: {pipeline_res.error_message})")

        results.append({
            "id": q_id,
            "category": category,
            "question": q_text,
            "success": pipeline_res.success,
            "attempts": pipeline_res.attempts,
            "latency_ms": elapsed_ms,
            "sql": pipeline_res.sql,
            "chart_type": pipeline_res.chart_type,
            "error_message": pipeline_res.error_message,
        })

    # Metric Calculations
    total_q = len(questions)
    execution_accuracy = (successful_queries / total_q) * 100
    correction_rate = (queries_requiring_correction / total_q) * 100
    avg_attempts = total_attempts / total_q
    avg_latency = sum(latencies_ms) / total_q
    sorted_latencies = sorted(latencies_ms)
    p95_latency = sorted_latencies[int(0.95 * total_q) - 1] if total_q > 0 else 0

    summary = {
        "total_questions": total_q,
        "successful_queries": successful_queries,
        "failed_queries": total_q - successful_queries,
        "execution_accuracy_pct": round(execution_accuracy, 2),
        "correction_rate_pct": round(correction_rate, 2),
        "avg_attempts_per_query": round(avg_attempts, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "results": results,
    }

    print("\n=======================================================")
    print("📊 EVALUATION BENCHMARK SUMMARY METRICS")
    print("=======================================================")
    print(f"Total Questions Evaluated:    {total_q}")
    print(f"SQL Execution Accuracy:       {summary['execution_accuracy_pct']}% ({successful_queries}/{total_q})")
    print(f"Self-Correction Rate:         {summary['correction_rate_pct']}% ({queries_requiring_correction}/{total_q})")
    print(f"Average Attempts Per Query:   {summary['avg_attempts_per_query']}")
    print(f"Average Latency:              {summary['avg_latency_ms']} ms")
    print(f"P95 Latency:                  {summary['p95_latency_ms']} ms")
    print("=======================================================\n")

    return summary

if __name__ == "__main__":
    run_evaluation_benchmark()
