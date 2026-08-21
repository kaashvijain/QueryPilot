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
  insight?: string;
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
  const [showSql, setShowSql] = useState(false);

  if (!result) return null;

  const handleCopySql = () => {
    if (result.sql) {
      navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { sql, attempts, results, success, error_message, insight, explanation } = result;
  const isSuccess = success !== undefined ? success : (results !== undefined && results.rows !== undefined);
  const hasError = isSuccess === false || Boolean(error_message);
  const analystAnswer = insight || explanation;

  return (
    <div className="workspace-fade-in" style={{ width: "100%", textAlign: "left" }}>
      {/* Execution Error Banner */}
      {hasError && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            color: "var(--error-red)",
            fontSize: "0.9rem",
          }}
        >
          <strong>Query Error:</strong> {error_message || "Query execution failed."}
        </div>
      )}

      {/* 1. Direct Analyst Answer (Primary Headline Output) */}
      {analystAnswer && (
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "0.4rem",
            }}
          >
            Insight
          </div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
            }}
          >
            {analystAnswer}
          </h3>
        </div>
      )}

      {/* 2. Editorial Chart Visualization */}
      <div style={{ marginBottom: "2.5rem" }}>
        <ChartVisualization result={result} />
      </div>

      {/* 3. Generated SQL (Collapsible Section) */}
      {sql && (
        <div style={{ marginBottom: "2.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showSql ? "0.75rem" : 0,
            }}
          >
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: 0,
              }}
            >
              <svg
                style={{
                  width: "14px",
                  height: "14px",
                  transform: showSql ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showSql ? "Hide Generated SQL" : "Show Generated SQL"}
            </button>

            {showSql && (
              <button
                type="button"
                onClick={handleCopySql}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--accent-blue)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy SQL"}
              </button>
            )}
          </div>

          {showSql && (
            <pre
              style={{
                backgroundColor: "#1c1917",
                color: "#38bdf8",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                border: "1px solid #292524",
              }}
            >
              <code>{sql}</code>
            </pre>
          )}
        </div>
      )}

      {/* 4. Data Output Table */}
      {results && results.columns && results.columns.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.85rem",
            }}
          >
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Results
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              {results.row_count.toLocaleString()} {results.row_count === 1 ? "row" : "rows"}
              {results.execution_time_ms ? ` · ${results.execution_time_ms.toFixed(1)} ms` : ""}
              {attempts > 1 ? ` · ${attempts} attempts` : ""}
            </div>
          </div>

          <div
            style={{
              overflowX: "auto",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              maxHeight: "450px",
              overflowY: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                  {results.columns.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: "0.65rem 0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        top: 0,
                        backgroundColor: "var(--bg-secondary)",
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
                      style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}
                    >
                      Query executed successfully, but returned 0 matching rows.
                    </td>
                  </tr>
                ) : (
                  results.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        borderBottom: rIdx < results.rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        backgroundColor: rIdx % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)",
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            padding: "0.6rem 0.85rem",
                            color: cell === null ? "var(--text-muted)" : "var(--text-primary)",
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
  );
}
