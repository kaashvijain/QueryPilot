"use client";

import React, { useState } from "react";
import DatasetSchema from "@/components/DatasetSchema";

interface DatasetMetadata {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
}

interface DatasetBannerProps {
  dataset: DatasetMetadata;
  onChangeDataset: () => void;
}

export default function DatasetBanner({ dataset, onChangeDataset }: DatasetBannerProps) {
  const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);

  return (
    <div style={{ width: "100%", marginBottom: "1.25rem" }}>
      {/* Banner Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Left Dataset Summary Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {dataset.filename}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
              {dataset.rows.toLocaleString()} rows · {dataset.columns} columns
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <svg
              style={{
                width: "14px",
                height: "14px",
                transform: showSchemaDrawer ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showSchemaDrawer ? "Hide Schema" : "View Schema"}
          </button>

          <button
            type="button"
            onClick={onChangeDataset}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Change Dataset
          </button>
        </div>
      </div>

      {/* Collapsible Schema Drawer with Smooth Transition */}
      {showSchemaDrawer && (
        <div className="workspace-fade-in" style={{ marginTop: "0.75rem" }}>
          <DatasetSchema datasetId={dataset.dataset_id} compactMode={true} />
        </div>
      )}
    </div>
  );
}
