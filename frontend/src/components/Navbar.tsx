"use client";

import React from "react";

export type ViewTab = "analyze" | "history" | "dataset";

interface DatasetMetadata {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
}

interface NavbarProps {
  activeView: ViewTab;
  onSelectView: (view: ViewTab) => void;
  dataset: DatasetMetadata | null;
}

export default function Navbar({ activeView, onSelectView, dataset }: NavbarProps) {
  return (
    <header
      style={{
        width: "100%",
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Left Brand Identity */}
        <div
          onClick={() => onSelectView("analyze")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.95rem",
              letterSpacing: "-0.02em",
            }}
          >
            QP
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              QueryPilot
            </h1>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                display: "block",
              }}
            >
              AI Data Analyst
            </span>
          </div>
        </div>

        {/* Center View Switcher Tabs */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "var(--bg-secondary)",
            padding: "0.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            gap: "0.25rem",
          }}
        >
          {(
            [
              { id: "analyze", label: "Analyze" },
              { id: "history", label: "History" },
              { id: "dataset", label: "Dataset" },
            ] as const
          ).map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectView(tab.id)}
                style={{
                  padding: "0.35rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--bg-primary)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Dataset & Engine Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Active Dataset Pill */}
          <div
            onClick={() => onSelectView(dataset ? "dataset" : "analyze")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: dataset ? "var(--text-primary)" : "var(--text-muted)",
              backgroundColor: "var(--bg-secondary)",
              padding: "0.3rem 0.75rem",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: dataset ? "var(--accent-blue)" : "var(--border-medium)",
              }}
            />
            {dataset ? (
              <span>
                <strong>{dataset.filename}</strong> · {dataset.rows.toLocaleString()} rows
              </span>
            ) : (
              <span>No Dataset Active</span>
            )}
          </div>

          {/* Engine Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--success-green)",
              backgroundColor: "var(--success-bg)",
              padding: "0.3rem 0.75rem",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--success-border)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }}
            />
            Ready
          </div>
        </div>
      </div>
    </header>
  );
}
