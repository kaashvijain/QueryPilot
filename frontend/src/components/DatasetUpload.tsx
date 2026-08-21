"use client";

import React, { useState, useRef } from "react";

interface UploadedDataset {
  dataset_id: string;
  filename: string;
  row_count: number;
  column_count: number;
}

interface DatasetUploadProps {
  onUploadSuccess?: (datasetId: string, metadata?: { filename: string; rows: number; columns: number }) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DatasetUpload({ onUploadSuccess }: DatasetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDataset | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported.");
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
      setUploadedDataset(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported.");
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
      setUploadedDataset(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/dataset`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to upload CSV dataset.");
      }

      setUploadedDataset(data);
      if (onUploadSuccess) {
        onUploadSuccess(data.dataset_id, {
          filename: data.filename || file.name,
          rows: data.rows || data.row_count || 0,
          columns: data.columns || data.column_count || 0,
        });
      }
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ width: "100%", textAlign: "left" }}>
      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? "2px dashed #2563eb" : "2px dashed #cbd5e1",
          borderRadius: "12px",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
          transition: "all 0.2s ease-in-out",
          cursor: "pointer",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="csv-file-input"
        />

        {/* Upload SVG Icon */}
        <svg
          style={{ width: "40px", height: "40px", color: "#64748b", margin: "0 auto 0.5rem" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem" }}>
          Upload your dataset
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
          Drag and drop your CSV file here, or click to browse
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#0f172a",
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            cursor: "pointer",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          Choose CSV File
        </button>

        {file && (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#2563eb",
              backgroundColor: "#eff6ff",
              padding: "0.5rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            <svg
              style={{ width: "16px", height: "16px", flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Upload Action Button */}
      <div style={{ marginTop: "1rem" }}>
        <button
          id="upload-button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: !file || isUploading ? "#94a3b8" : "#0f172a",
            border: "none",
            borderRadius: "8px",
            cursor: !file || isUploading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {isUploading ? (
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
              Ingesting CSV Dataset...
            </>
          ) : (
            "Upload Dataset"
          )}
        </button>
      </div>

      {/* Error Banner */}
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
            fontWeight: 500,
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
            xmlns="http://www.w3.org/2000/svg"
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

      {/* Success Card */}
      {uploadedDataset && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1.25rem",
            borderRadius: "10px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg
                style={{ width: "20px", height: "20px", color: "#166534", flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>Dataset Loaded Successfully</h4>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: "#dcfce7",
                color: "#15803d",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
              }}
            >
              ID: {uploadedDataset.dataset_id.slice(0, 8)}...
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ backgroundColor: "#ffffff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #dcfce7" }}>
              <div style={{ fontSize: "0.75rem", color: "#65a30d", textTransform: "uppercase", fontWeight: 600 }}>File Name</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#14532d", overflow: "hidden", textOverflow: "ellipsis" }}>
                {uploadedDataset.filename}
              </div>
            </div>

            <div style={{ backgroundColor: "#ffffff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #dcfce7" }}>
              <div style={{ fontSize: "0.75rem", color: "#65a30d", textTransform: "uppercase", fontWeight: 600 }}>Rows</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#14532d" }}>
                {uploadedDataset.row_count.toLocaleString()}
              </div>
            </div>

            <div style={{ backgroundColor: "#ffffff", padding: "0.75rem", borderRadius: "6px", border: "1px solid #dcfce7" }}>
              <div style={{ fontSize: "0.75rem", color: "#65a30d", textTransform: "uppercase", fontWeight: 600 }}>Columns</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#14532d" }}>
                {uploadedDataset.column_count}
              </div>
            </div>
          </div>
        </div>
      )}

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
