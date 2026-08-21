"use client";

import React, { useState, useEffect } from "react";

export interface ColumnSchema {
  name: string;
  type: string;
}

export interface DatasetSchemaResponse {
  dataset_id: string;
  table_name: string;
  row_count: number;
  columns: ColumnSchema[];
}

interface DatasetSchemaProps {
  datasetId: string;
  compactMode?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DatasetSchema({ datasetId, compactMode = false }: DatasetSchemaProps) {
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
      return { bg: "var(--success-bg)", color: "var(--success-green)", border: "var(--success-border)" };
    }
    if (t.includes("DATE") || t.includes("TIME")) {
      return { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" };
    }
    if (t.includes("BOOL")) {
      return { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" };
    }
    return { bg: "var(--accent-blue-bg)", color: "var(--accent-blue)", border: "var(--accent-blue-border)" };
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          padding: compactMode ? "1.5rem" : "2.5rem 1.5rem",
          backgroundColor: "var(--bg-primary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
          Loading dataset schema...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          padding: "0.85rem 1rem",
          backgroundColor: "var(--error-bg)",
          border: "1px solid var(--error-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--error-red)",
          fontSize: "0.85rem",
        }}
      >
        {error}
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "var(--bg-primary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      {/* Schema Header */}
      {!compactMode && (
        <div
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Dataset Schema
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
              Table: <code>{schema.table_name}</code>
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                padding: "0.2rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {schema.columns.length} Columns
            </span>
          </div>
        </div>
      )}

      {/* Columns List */}
      <div style={{ padding: compactMode ? "0.75rem" : "1rem 1.25rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compactMode ? "repeat(auto-fill, minmax(220px, 1fr))" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "0.5rem",
            maxHeight: compactMode ? "280px" : "none",
            overflowY: compactMode ? "auto" : "visible",
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
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {col.name}
                </span>

                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    padding: "0.1rem 0.4rem",
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
