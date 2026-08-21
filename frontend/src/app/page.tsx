"use client";

import { useState } from "react";
import DatasetUpload from "@/components/DatasetUpload";
import DatasetSchema from "@/components/DatasetSchema";
import QueryInput from "@/components/QueryInput";
import QueryResult from "@/components/QueryResult";

export default function Home() {
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);

  const handleUploadSuccess = (id: string) => {
    setActiveDatasetId(id);
    setQueryResult(null); // Clear previous results on new dataset upload
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Navigation Header */}
      <header
        style={{
          width: "100%",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          padding: "1rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.1rem",
              }}
            >
              QP
            </div>
            <div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                QueryPilot
              </h1>
              <p style={{ fontSize: "0.8rem", color: "#64748b" }}>
                AI-Powered Natural Language Analytics Platform
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              border: "1px solid #e2e8f0",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                display: "inline-block",
              }}
            />
            Engine Ready (DuckDB + Gemini)
          </div>
        </div>
      </header>

      {/* Main Spread-Out Dashboard Layout */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "2rem 2rem 4rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: activeDatasetId ? "1fr 1fr" : "1fr",
            gap: "2rem",
            alignItems: "start",
            transition: "all 0.3s ease-in-out",
          }}
        >
          {/* Left Column: Upload & Query Input */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <DatasetUpload onUploadSuccess={handleUploadSuccess} />
            <QueryInput
              datasetId={activeDatasetId}
              onQuerySuccess={(result) => setQueryResult(result)}
            />
            {queryResult && <QueryResult result={queryResult} />}
          </div>

          {/* Right Column: Schema Section */}
          <div style={{ width: "100%" }}>
            {activeDatasetId ? (
              <DatasetSchema datasetId={activeDatasetId} />
            ) : (
              <div
                style={{
                  border: "2px dashed #e2e8f0",
                  borderRadius: "12px",
                  padding: "3.5rem 2rem",
                  textAlign: "center",
                  backgroundColor: "#fafafa",
                }}
              >
                <svg
                  style={{ width: "48px", height: "48px", color: "#cbd5e1", margin: "0 auto 1rem" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s-8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                  Dataset Schema Inspector
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#94a3b8", maxWidth: "380px", margin: "0 auto" }}>
                  Upload a CSV file to inspect detected table columns, data types, and row statistics.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
