import json
import csv
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
from services.llm_service import LLMClient

BENCHMARK_JSON_PATH = Path(__file__).parent / "evaluation_benchmark.json"
REPORT_JSON_PATH = Path(__file__).parent / "evaluation_report.json"
REPORT_CSV_PATH = Path(__file__).parent / "evaluation_report.csv"

# Gemini 3.6 / 2.5 Flash Estimated Pricing per 1M tokens
COST_PER_1M_INPUT = 0.075
COST_PER_1M_OUTPUT = 0.30

def run_evaluation_benchmark(
    dataset_id: str = "sample_superstore",
    db_path: str = None,
    output_json_path: Path = REPORT_JSON_PATH,
    output_csv_path: Path = REPORT_CSV_PATH,
) -> Dict[str, Any]:
    """
    Executes the 50 evaluation benchmark questions, records execution success, latency,
    token usage, and outputs structured JSON and CSV report files.
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

    total_input_tokens = 0
    total_output_tokens = 0

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

        # Estimate token usage based on query complexity and attempts (approx ~350 in, ~120 out per attempt)
        est_input_tokens = pipeline_res.attempts * 350
        est_output_tokens = pipeline_res.attempts * 120
        total_input_tokens += est_input_tokens
        total_output_tokens += est_output_tokens

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
            "latency_ms": round(elapsed_ms, 2),
            "input_tokens": est_input_tokens,
            "output_tokens": est_output_tokens,
            "total_tokens": est_input_tokens + est_output_tokens,
            "chart_type": pipeline_res.chart_type,
            "sql": pipeline_res.sql,
            "explanation": pipeline_res.explanation,
            "error_message": pipeline_res.error_message or "",
        })

    # Summary Metrics Calculations
    total_q = len(questions)
    execution_accuracy = (successful_queries / total_q) * 100
    correction_rate = (queries_requiring_correction / total_q) * 100
    avg_attempts = total_attempts / total_q
    avg_latency = sum(latencies_ms) / total_q
    sorted_latencies = sorted(latencies_ms)
    p95_latency = sorted_latencies[int(0.95 * total_q) - 1] if total_q > 0 else 0

    est_input_cost = (total_input_tokens / 1_000_000) * COST_PER_1M_INPUT
    est_output_cost = (total_output_tokens / 1_000_000) * COST_PER_1M_OUTPUT
    est_total_cost = est_input_cost + est_output_cost

    summary = {
        "total_questions": total_q,
        "successful_queries": successful_queries,
        "failed_queries": total_q - successful_queries,
        "execution_accuracy_pct": round(execution_accuracy, 2),
        "correction_rate_pct": round(correction_rate, 2),
        "avg_attempts_per_query": round(avg_attempts, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_tokens": total_input_tokens + total_output_tokens,
        "estimated_api_cost_usd": round(est_total_cost, 5),
        "results": results,
    }

    # 1. Output JSON Report
    with open(output_json_path, "w", encoding="utf-8") as f_json:
        json.dump(summary, f_json, indent=2)
    print(f"\n📁 JSON Evaluation Report saved to: {output_json_path}")

    # 2. Output CSV Report
    fieldnames = [
        "id", "category", "question", "success", "attempts",
        "latency_ms", "input_tokens", "output_tokens", "total_tokens",
        "chart_type", "sql", "error_message"
    ]
    with open(output_csv_path, "w", newline="", encoding="utf-8") as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow({k: r[k] for k in fieldnames})
    print(f"📁 CSV Evaluation Report saved to:  {output_csv_path}")

    print("\n=======================================================")
    print("📊 EVALUATION BENCHMARK SUMMARY METRICS")
    print("=======================================================")
    print(f"Total Questions Evaluated:    {total_q}")
    print(f"SQL Execution Accuracy:       {summary['execution_accuracy_pct']}% ({successful_queries}/{total_q})")
    print(f"Self-Correction Rate:         {summary['correction_rate_pct']}% ({queries_requiring_correction}/{total_q})")
    print(f"Average Attempts Per Query:   {summary['avg_attempts_per_query']}")
    print(f"Average Latency:              {summary['avg_latency_ms']} ms")
    print(f"P95 Latency:                  {summary['p95_latency_ms']} ms")
    print(f"Total Tokens Consumed:        {summary['total_tokens']:,}")
    print(f"Estimated API Cost:           ${summary['estimated_api_cost_usd']:.5f}")
    print("=======================================================\n")

    return summary

if __name__ == "__main__":
    run_evaluation_benchmark()
