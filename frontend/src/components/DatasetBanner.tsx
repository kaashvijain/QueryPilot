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
    <div style={{ width: "100%", marginBottom: "1.5rem" }}>
      {/* Banner Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.85rem 1.25rem",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        {/* Left Dataset Summary Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--accent-blue-bg)",
              border: "1px solid var(--accent-blue-border)",
              color: "var(--accent-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {dataset.filename}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--success-green)",
                  backgroundColor: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                Ready
              </span>
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
              fontWeight: 600,
              color: "var(--text-secondary)",
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
                transition: "transform 0.2s ease",
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
              color: "var(--text-muted)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Change Dataset
          </button>
        </div>
      </div>

      {/* Collapsible Schema Drawer */}
      {showSchemaDrawer && (
        <div style={{ marginTop: "0.75rem" }}>
          <DatasetSchema datasetId={dataset.dataset_id} compactMode={true} />
        </div>
      )}
    </div>
  );
}
