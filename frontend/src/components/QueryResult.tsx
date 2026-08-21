"use client";

import React, { useState } from "react";
import ChartVisualization from "@/components/ChartVisualization";

interface QueryResultsPayload {
  columns: string[];
  rows: any[][];
  row_count: number;
  execution_time_ms: number;
}

interface QueryResponse {
  dataset_id: string;
  question: string;
  sql: string;
  explanation: string;
  attempts: number;
  results: QueryResultsPayload;
  chart?: { type: string };
  chart_type?: string;
  success: boolean;
  error_message?: string | null;
}

interface QueryResultProps {
  result: QueryResponse | null;
}

export default function QueryResult({ result }: QueryResultProps) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopySql = () => {
    if (result.sql) {
      navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { sql, attempts, results, success, error_message } = result;
  const isSuccess = success !== undefined ? success : (results !== undefined && results.rows !== undefined);
  const hasError = isSuccess === false || Boolean(error_message);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg
            style={{ width: "20px", height: "20px", color: isSuccess ? "#166534" : "#991b1b", flexShrink: 0 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
            Query Results
          </h3>
        </div>

        {/* Metadata Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Attempts Badge */}
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: attempts > 1 ? "#fef3c7" : "#f1f5f9",
              color: attempts > 1 ? "#92400e" : "#334155",
              border: `1px solid ${attempts > 1 ? "#fde68a" : "#cbd5e1"}`,
              padding: "0.2rem 0.6rem",
              borderRadius: "6px",
            }}
          >
            {attempts === 1 ? "1 Attempt" : `Self-Corrected (${attempts} Attempts)`}
          </span>

          {/* Execution Time */}
          {results?.execution_time_ms !== undefined && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
              }}
            >
              {results.execution_time_ms.toFixed(2)} ms
            </span>
          )}

          {/* Total Rows */}
          {results?.row_count !== undefined && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #bae6fd",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
              }}
            >
              {results.row_count.toLocaleString()} {results.row_count === 1 ? "Row" : "Rows"}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem" }}>
        {/* Error Banner */}
        {hasError && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              style={{ width: "18px", height: "18px", color: "#991b1b", flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <strong>Execution Error:</strong> {error_message || "Query execution failed after self-correction retries."}
            </div>
          </div>
        )}

        {/* Generated SQL Code Box */}
        {sql && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Generated SQL
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#3b82f6",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <svg
                  style={{ width: "14px", height: "14px" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {copied ? "Copied!" : "Copy SQL"}
              </button>
            </div>

            <pre
              style={{
                backgroundColor: "#0f172a",
                color: "#38bdf8",
                padding: "1rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                border: "1px solid #1e293b",
              }}
            >
              <code>{sql}</code>
            </pre>
          </div>
        )}

        {/* Chart Visualization */}
        <ChartVisualization result={result} />

        {/* Results Table */}
        {results && results.columns && results.columns.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Data Output Table ({results.row_count.toLocaleString()} Rows)
            </div>

            <div
              style={{
                overflowX: "auto",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {results.columns.map((col, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: "0.75rem 1rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          position: "sticky",
                          top: 0,
                          backgroundColor: "#f8fafc",
                          zIndex: 1,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={results.columns.length}
                        style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}
                      >
                        Query executed successfully, but returned 0 matching rows.
                      </td>
                    </tr>
                  ) : (
                    results.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: rIdx < results.rows.length - 1 ? "1px solid #f1f5f9" : "none",
                          backgroundColor: rIdx % 2 === 0 ? "#ffffff" : "#f8fafc",
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: "0.65rem 1rem",
                              color: cell === null ? "#94a3b8" : "#334155",
                              fontStyle: cell === null ? "italic" : "normal",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cell === null ? "NULL" : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
