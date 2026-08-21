"use client";

import React, { useState, useEffect } from "react";

interface ColumnSchema {
  name: string;
  type: string;
}

interface DatasetSchemaResponse {
  dataset_id: string;
  table_name: string;
  row_count: number;
  columns: ColumnSchema[];
}

interface DatasetSchemaProps {
  datasetId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DatasetSchema({ datasetId }: DatasetSchemaProps) {
  const [schema, setSchema] = useState<DatasetSchemaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;

    const fetchSchema = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/dataset/${datasetId}/schema`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to retrieve dataset schema.");
        }
        setSchema(data);
      } catch (err: any) {
        setError(err.message || "Failed to load schema.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, [datasetId]);

  const getTypeBadgeStyle = (typeStr: string) => {
    const t = typeStr.toUpperCase();
    if (
      t.includes("INT") ||
      t.includes("DOUBLE") ||
      t.includes("FLOAT") ||
      t.includes("DECIMAL") ||
      t.includes("NUMBER")
    ) {
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" }; // Green
    }
    if (t.includes("DATE") || t.includes("TIME")) {
      return { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" }; // Purple
    }
    if (t.includes("BOOL")) {
      return { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" }; // Orange
    }
    return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" }; // Blue default (VARCHAR/TEXT)
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          padding: "2.5rem 1.5rem",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "3px solid #cbd5e1",
            borderTop: "3px solid #0f172a",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 0.75rem",
          }}
        />
        <p style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>
          Loading dataset schema...
        </p>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          padding: "1rem",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "10px",
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
        {error}
      </div>
    );
  }

  if (!schema) return null;

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
      {/* Schema Card Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <svg
            style={{ width: "20px", height: "20px", color: "#0f172a", flexShrink: 0 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              Detected Dataset Schema
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Table:{" "}
              <code
                style={{
                  backgroundColor: "#e2e8f0",
                  padding: "0.1rem 0.3rem",
                  borderRadius: "4px",
                }}
              >
                {schema.table_name}
              </code>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
            }}
          >
            {schema.row_count.toLocaleString()} Rows
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
            }}
          >
            {schema.columns.length} Columns
          </span>
        </div>
      </div>

      {/* Columns List / Table */}
      <div style={{ padding: "0.5rem 1.5rem 1.25rem" }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            margin: "1rem 0 0.5rem",
            letterSpacing: "0.05em",
          }}
        >
          Columns & Data Types
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            maxHeight: "320px",
            overflowY: "auto",
            paddingRight: "0.25rem",
          }}
        >
          {schema.columns.map((col, idx) => {
            const badgeStyle = getTypeBadgeStyle(col.type);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  backgroundColor: idx % 2 === 0 ? "#f8fafc" : "#ffffff",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg
                    style={{ width: "14px", height: "14px", color: "#94a3b8" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                    />
                  </svg>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>
                    {col.name}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  {col.type}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
