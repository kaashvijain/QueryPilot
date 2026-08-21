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
    <div style={{ width: "100%", marginTop: "2rem", textAlign: "left" }}>
      {/* Result Metadata Header Line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "0.75rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Analysis Result
          </h3>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {attempts > 1 && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Self-Corrected ({attempts} Attempts)
            </span>
          )}

          {results?.execution_time_ms !== undefined && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {results.execution_time_ms.toFixed(1)} ms
            </span>
          )}

          {results?.row_count !== undefined && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {results.row_count.toLocaleString()} {results.row_count === 1 ? "Row" : "Rows"}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
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
          <strong>Execution Error:</strong> {error_message || "Query execution failed."}
        </div>
      )}

      {/* 1. Analyst Answer / Key Insight (Elegantly Styled Analyst Response) */}
      {analystAnswer && (
        <div
          style={{
            marginBottom: "2rem",
            paddingLeft: "1.25rem",
            borderLeft: "3px solid var(--accent-blue)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--accent-blue)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.3rem",
            }}
          >
            Analyst Insight
          </div>
          <p
            style={{
              fontSize: "1.05rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              lineHeight: 1.6,
            }}
          >
            {analystAnswer}
          </p>
        </div>
      )}

      {/* 2. Chart Visualization */}
      <div style={{ marginBottom: "2rem" }}>
        <ChartVisualization result={result} />
      </div>

      {/* 3. Generated SQL (Collapsible Section) */}
      {sql && (
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
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
                backgroundColor: "#0f172a",
                color: "#38bdf8",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                border: "1px solid #1e293b",
              }}
            >
              <code>{sql}</code>
            </pre>
          )}
        </div>
      )}

      {/* 4. Data Output Table */}
      {results && results.columns && results.columns.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.6rem",
            }}
          >
            Data Output Table ({results.row_count.toLocaleString()} Rows)
          </div>

          <div
            style={{
              overflowX: "auto",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                  {results.columns.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: "0.75rem 1rem",
                        fontWeight: 700,
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
                            padding: "0.65rem 1rem",
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
