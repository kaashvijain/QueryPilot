"use client";

import React, { useState, useEffect } from "react";

export interface HistoryItem {
  id: string;
  datasetId: string;
  datasetName: string;
  question: string;
  sql: string;
  insight?: string;
  chartType?: string;
  rowCount: number;
  createdAt: string;
  previewRows: any[][];
  columns: string[];
}

interface HistoryViewProps {
  activeDatasetId: string | null;
  onSelectQuery: (item: HistoryItem) => void;
  onRerunQuery: (question: string) => void;
}

const STORAGE_KEY = "query_pilot_history";

export function saveToHistory(item: Omit<HistoryItem, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: "hist_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      previewRows: item.previewRows ? item.previewRows.slice(0, 5) : [],
    };
    const updated = [newItem, ...existing.filter((h) => h.question !== item.question)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function HistoryView({ activeDatasetId, onSelectQuery, onRerunQuery }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all analysis history?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCopySql = (sql: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRerun = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.datasetId !== activeDatasetId) {
      setWarningMsg("This dataset is no longer available. Upload the dataset again to rerun this analysis.");
      setTimeout(() => setWarningMsg(null), 4000);
      return;
    }
    onRerunQuery(item.question);
  };

  if (history.length === 0) {
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
          No Analysis History Yet
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto" }}>
          Questions you analyze will be automatically saved here for quick reference and rerunning.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", padding: "1rem 0 3rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Analysis History
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {history.length} saved query {history.length === 1 ? "result" : "results"} stored locally
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--error-red)",
            backgroundColor: "transparent",
            border: "1px solid var(--border-subtle)",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Clear History
        </button>
      </div>

      {/* Warning Notice for Expired Dataset Rerun */}
      {warningMsg && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.85rem 1rem",
            backgroundColor: "#fff7ed",
            border: "1px solid #ffedd5",
            borderRadius: "var(--radius-md)",
            color: "#c2410c",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          {warningMsg}
        </div>
      )}

      {/* Recent Queries Horizontal Cards Carousel */}
      <div style={{ marginBottom: "2rem" }}>
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
          Recent Queries
        </div>

        <div className="horizontal-scroll-container">
          {history.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="horizontal-scroll-card interactive-hover"
              onClick={() => onSelectQuery(item)}
              style={{
                width: "260px",
                padding: "1rem",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  {item.datasetName} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginTop: "0.25rem",
                    lineHeight: 1.35,
                  }}
                >
                  "{item.question}"
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-blue)", fontWeight: 600 }}>
                  {item.rowCount} rows
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  View →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full History List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectQuery(item)}
            className="interactive-hover"
            style={{
              padding: "1rem 1.25rem",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ flex: "1 1 300px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.question}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-secondary)",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                  }}
                >
                  {item.datasetName}
                </span>
              </div>

              {item.insight && (
                <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {item.insight}
                </p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={(e) => handleCopySql(item.sql, item.id, e)}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--accent-blue)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {copiedId === item.id ? "Copied!" : "Copy SQL"}
              </button>

              <button
                type="button"
                onClick={(e) => handleRerun(item, e)}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-medium)",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Rerun
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteItem(item.id, e)}
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.2rem",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
