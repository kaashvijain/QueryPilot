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
  const [activeTab, setActiveTab] = useState<"overview" | "columns" | "preview">("overview");
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
          No active dataset
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
            color: "var(--bg-primary)",
            backgroundColor: "var(--text-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Upload CSV dataset
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", padding: "1rem 0 3rem" }}>
      {/* Header Summary */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          {dataset.filename}
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          {dataset.rows.toLocaleString()} rows · {dataset.columns} columns
        </p>
      </div>

      {/* Sub Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
        }}
      >
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "columns", label: "Columns" },
            { id: "preview", label: "Preview" },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.5rem 0",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: isActive ? "2px solid var(--text-primary)" : "2px solid transparent",
                backgroundColor: "transparent",
                borderLeft: "none",
                borderRight: "none",
                borderTop: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Total Records</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {dataset.rows.toLocaleString()}
            </div>
          </div>
          <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Columns Analyzed</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {dataset.columns}
            </div>
          </div>
        </div>
      )}

      {activeTab === "columns" && (
        <DatasetSchema datasetId={dataset.dataset_id} compactMode={false} />
      )}

      {activeTab === "preview" && (
        <div>
          {isLoadingPreview ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
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
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                    {previewData.columns.map((col, idx) => {
                      const isNum = previewData.rows.length > 0 && typeof previewData.rows[0][idx] === "number";
                      return (
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
                            textAlign: isNum ? "right" : "left",
                          }}
                        >
                          {col}
                        </th>
                      );
                    })}
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
                      {row.map((cell, cIdx) => {
                        const isNum = typeof cell === "number";
                        const formattedCell = isNum ? cell.toLocaleString(undefined, { maximumFractionDigits: 2 }) : cell === null ? "NULL" : String(cell);
                        return (
                          <td
                            key={cIdx}
                            style={{
                              padding: "0.6rem 0.85rem",
                              color: cell === null ? "var(--text-muted)" : "var(--text-primary)",
                              fontStyle: cell === null ? "italic" : "normal",
                              whiteSpace: "nowrap",
                              textAlign: isNum ? "right" : "left",
                            }}
                          >
                            {formattedCell}
                          </td>
                        );
                      })}
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
