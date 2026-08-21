"use client";

import React, { useState } from "react";

interface QueryInputProps {
  datasetId: string | null;
  onQuerySuccess?: (queryResult: any) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLE_QUESTIONS = [
  "What are the top 5 products by revenue?",
  "What is the average sales per region?",
  "Show total quantity sold for each category",
];

export default function QueryInput({ datasetId, onQuerySuccess }: QueryInputProps) {
  const [question, setQuestion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!datasetId) {
      setError("Please upload a CSV dataset first before submitting a query.");
      return;
    }

    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please enter a question about your dataset.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          question: trimmed,
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

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        padding: "1.5rem",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
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
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
          Ask Natural Language Question
        </h3>
      </div>

      {/* Query Textarea */}
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
              ? "Ask any question about your data (e.g., Which product generated the highest revenue?)"
              : "Please upload a CSV dataset above to start asking questions..."
          }
          rows={3}
          style={{
            width: "100%",
            padding: "0.85rem 1rem",
            fontSize: "0.95rem",
            color: "#0f172a",
            backgroundColor: !datasetId || isProcessing ? "#f8fafc" : "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            cursor: !datasetId || isProcessing ? "not-allowed" : "text",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        />

        {/* Keyboard shortcut hint */}
        {datasetId && (
          <div
            style={{
              position: "absolute",
              bottom: "0.75rem",
              right: "0.75rem",
              fontSize: "0.75rem",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            Press Ctrl+Enter
          </div>
        )}
      </div>

      {/* Sample Question Chips */}
      {datasetId && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Try asking:</span>
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setQuestion(q);
                setError(null);
              }}
              style={{
                fontSize: "0.75rem",
                color: "#334155",
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "9999px",
                padding: "0.2rem 0.6rem",
                cursor: isProcessing ? "not-allowed" : "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
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
      )}

      {/* Analyze Action Button */}
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={handleAnalyze}
          disabled={!datasetId || isProcessing || !question.trim()}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: !datasetId || isProcessing || !question.trim() ? "#94a3b8" : "#0f172a",
            border: "none",
            borderRadius: "8px",
            cursor: !datasetId || isProcessing || !question.trim() ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {isProcessing ? (
            <>
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  display: "inline-block",
                }}
              />
              Analyzing Question & Generating SQL...
            </>
          ) : (
            <>
              <svg
                style={{ width: "18px", height: "18px" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Analyze Question
            </>
          )}
        </button>
      </div>

      {/* Inline Keyframes */}
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
