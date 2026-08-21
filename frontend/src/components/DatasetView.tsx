"use client";

import React, { useState, useEffect } from "react";
import DatasetSchema from "@/components/DatasetSchema";

interface DatasetMetadata {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
}

interface DatasetViewProps {
  dataset: DatasetMetadata | null;
  onUploadClick: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DatasetView({ dataset, onUploadClick }: DatasetViewProps) {
  const [activeTab, setActiveTab] = useState<"schema" | "preview">("schema");
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!dataset || activeTab !== "preview" || previewData) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataset_id: dataset.dataset_id,
            question: "SELECT * FROM sales LIMIT 20",
          }),
        });
        const data = await res.json();
        if (data.results) {
          setPreviewData({
            columns: data.results.columns,
            rows: data.results.rows,
          });
        }
      } catch (err) {
        console.error("Failed to load data preview:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [dataset, activeTab, previewData]);

  if (!dataset) {
    return (
      <div
        style={{
          padding: "4rem 2rem",
          textAlign: "center",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          margin: "2rem 0",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          No Active Dataset Loaded
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
          Upload a CSV dataset to inspect column data types, table structures, and preview sample records.
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: "var(--accent-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Upload CSV Dataset
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", padding: "1rem 0 3rem" }}>
      {/* Header Summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {dataset.filename}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
            Dataset ID: <code style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{dataset.dataset_id}</code>
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Rows
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {dataset.rows.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Columns
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {dataset.columns}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("schema")}
          style={{
            padding: "0.5rem 0.25rem",
            fontSize: "0.9rem",
            fontWeight: activeTab === "schema" ? 700 : 500,
            color: activeTab === "schema" ? "var(--text-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "schema" ? "2px solid var(--accent-primary)" : "2px solid transparent",
            backgroundColor: "transparent",
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            cursor: "pointer",
          }}
        >
          Schema Inspector
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          style={{
            padding: "0.5rem 0.25rem",
            fontSize: "0.9rem",
            fontWeight: activeTab === "preview" ? 700 : 500,
            color: activeTab === "preview" ? "var(--text-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "preview" ? "2px solid var(--accent-primary)" : "2px solid transparent",
            backgroundColor: "transparent",
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            cursor: "pointer",
          }}
        >
          Data Sample Preview (First 20 Rows)
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "schema" ? (
        <DatasetSchema datasetId={dataset.dataset_id} compactMode={false} />
      ) : (
        <div>
          {isLoadingPreview ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Loading sample data preview...
            </div>
          ) : previewData ? (
            <div
              style={{
                overflowX: "auto",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                maxHeight: "500px",
                overflowY: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {previewData.columns.map((col, idx) => (
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
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        borderBottom: rIdx < previewData.rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              Unable to load preview data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
