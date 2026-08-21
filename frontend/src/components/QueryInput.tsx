"use client";

import React, { useState } from "react";

interface QueryInputProps {
  datasetId: string | null;
  activeQuestion?: string;
  isCollapsed?: boolean;
  onQuerySuccess?: (queryResult: any) => void;
  onEditQuestion?: (questionText: string) => void;
  onNewQuery?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  { label: "Top Products", question: "What are the top 5 products by revenue?" },
  { label: "Sales by Category", question: "What is the total revenue and quantity sold per category?" },
  { label: "Average Metric", question: "What is the average unit price and quantity across all orders?" },
  { label: "Monthly Trend", question: "Show total sales volume grouped by order date or month." },
  { label: "Lowest Performing", question: "Which 5 products have the lowest sales volume?" },
];

export default function QueryInput({
  datasetId,
  activeQuestion = "",
  isCollapsed = false,
  onQuerySuccess,
  onEditQuestion,
  onNewQuery,
}: QueryInputProps) {
  const [question, setQuestion] = useState(activeQuestion);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Synchronize initial question if prefilled from Edit Question
  React.useEffect(() => {
    if (activeQuestion) {
      setQuestion(activeQuestion);
    }
  }, [activeQuestion]);

  const handleAnalyze = async (overrideQuestion?: string) => {
    const qToRun = (overrideQuestion || question).trim();
    if (!datasetId) {
      setError("Please upload a CSV dataset first before submitting a query.");
      return;
    }

    if (!qToRun) {
      setError("Please enter a question about your dataset.");
      return;
    }

    setIsProcessing(true);
    setLoadingStepIdx(0);
    setError(null);

    const step1 = setTimeout(() => setLoadingStepIdx(1), 600);
    const step2 = setTimeout(() => setLoadingStepIdx(2), 1400);
    const step3 = setTimeout(() => setLoadingStepIdx(3), 2200);

    try {
      const res = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          question: qToRun,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error_message || "Failed to analyze question.");
      }

      if (onQuerySuccess) {
        onQuerySuccess(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while executing your query.");
    } finally {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isProcessing && datasetId && question.trim()) {
        handleAnalyze();
      }
    }
  };

  // State 2: Collapsed Context Bar (Post-Analysis State)
  if (isCollapsed && !isProcessing) {
    return (
      <div
        className="workspace-fade-in"
        style={{
          width: "100%",
          padding: "0.85rem 1.25rem",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: "1 1 300px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Question:
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            "{activeQuestion || question}"
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => onEditQuestion && onEditQuestion(activeQuestion || question)}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
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
            Edit question
          </button>

          <button
            type="button"
            onClick={() => {
              setQuestion("");
              if (onNewQuery) onNewQuery();
            }}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            New query
          </button>
        </div>
      </div>
    );
  }

  // State 1: Active Hero Query Input State (Before Analysis / Editing Query)
  return (
    <div className="workspace-fade-in" style={{ width: "100%", textAlign: "left", marginBottom: "2rem" }}>
      {/* Hero Heading & Subtitle */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: "0.35rem",
          }}
        >
          Ask your data anything
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
          Query your dataset using natural language. QueryPilot will generate, validate, and execute the SQL for you.
        </p>
      </div>

      {/* Query Input Box */}
      <div
        style={{
          width: "100%",
          backgroundColor: "var(--bg-primary)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-medium)",
          padding: "1rem 1.25rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ position: "relative" }}>
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={!datasetId || isProcessing}
            placeholder={
              datasetId
                ? "Which products generated the most revenue this year?"
                : "Please upload a CSV dataset above to start asking questions..."
            }
            rows={3}
            style={{
              width: "100%",
              padding: "0.25rem 0.25rem 2rem 0.25rem",
              fontSize: "1rem",
              color: "var(--text-primary)",
              backgroundColor: "transparent",
              border: "none",
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              cursor: !datasetId || isProcessing ? "not-allowed" : "text",
            }}
          />

          {/* Bottom Control Bar inside Textarea Container */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {datasetId ? "Press Ctrl+Enter to analyze" : "Dataset required"}
            </span>

            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={!datasetId || isProcessing || !question.trim()}
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: !datasetId || isProcessing || !question.trim() ? "var(--text-muted)" : "var(--accent-primary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: !datasetId || isProcessing || !question.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "background-color 0.15s ease",
              }}
            >
              {isProcessing ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-step Checklist Loading State */}
      {isProcessing && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Analyzing your data
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.825rem" }}>
            <div style={{ color: loadingStepIdx >= 0 ? "var(--success-green)" : "var(--text-muted)" }}>
              {loadingStepIdx > 0 ? "✓" : "●"} Understanding your question
            </div>
            <div style={{ color: loadingStepIdx >= 1 ? (loadingStepIdx > 1 ? "var(--success-green)" : "var(--text-primary)") : "var(--text-muted)" }}>
              {loadingStepIdx > 1 ? "✓" : loadingStepIdx === 1 ? "●" : "○"} Generating schema-aware SQL
            </div>
            <div style={{ color: loadingStepIdx >= 2 ? (loadingStepIdx > 2 ? "var(--success-green)" : "var(--text-primary)") : "var(--text-muted)" }}>
              {loadingStepIdx > 2 ? "✓" : loadingStepIdx === 2 ? "●" : "○"} Running DuckDB query
            </div>
            <div style={{ color: loadingStepIdx >= 3 ? "var(--text-primary)" : "var(--text-muted)" }}>
              {loadingStepIdx === 3 ? "●" : "○"} Preparing insights & chart
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            color: "var(--error-red)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Horizontally Scrollable Suggested Question Cards */}
      {datasetId && !isProcessing && (
        <div style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "0.6rem",
            }}
          >
            Try asking
          </div>

          <div className="horizontal-scroll-container">
            {SUGGESTED_QUESTIONS.map((item, idx) => (
              <div
                key={idx}
                className="horizontal-scroll-card interactive-hover"
                onClick={() => {
                  setQuestion(item.question);
                  setError(null);
                  handleAnalyze(item.question);
                }}
                style={{
                  width: "230px",
                  padding: "0.85rem 1rem",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                  {item.label}
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.35 }}>
                  {item.question}
                </p>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", alignSelf: "flex-end", fontWeight: 600 }}>
                  Run →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
