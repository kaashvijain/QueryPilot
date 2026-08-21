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
    <div style={{ width: "100%", maxWidth: "640px", margin: "0 auto", textAlign: "left" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          Upload your data
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Turn questions into insights.
        </p>
      </div>

      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? "1.5px dashed var(--accent-blue)" : "1.5px dashed var(--border-medium)",
          borderRadius: "var(--radius-lg)",
          padding: "3rem 1.5rem",
          textAlign: "center",
          backgroundColor: isDragging ? "var(--accent-blue-bg)" : "var(--bg-secondary)",
          transition: "all 0.15s ease-in-out",
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

        <svg
          style={{ width: "36px", height: "36px", color: "var(--text-secondary)", margin: "0 auto 0.75rem" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
          Drag and drop your CSV file here, or click to browse
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.825rem",
            fontWeight: 500,
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Select CSV
        </button>

        {file && (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.825rem",
              fontWeight: 500,
              color: "var(--accent-blue)",
              backgroundColor: "var(--accent-blue-bg)",
              padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Upload Action Button */}
      <div style={{ marginTop: "1.25rem" }}>
        <button
          id="upload-button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{
            width: "100%",
            padding: "0.7rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--bg-primary)",
            backgroundColor: !file || isUploading ? "var(--text-muted)" : "var(--text-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: !file || isUploading ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {isUploading ? (
            <>
              <svg
                style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span>Uploading CSV & Ingesting Dataset into DuckDB...</span>
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
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            color: "var(--error-red)",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Success Card */}
      {uploadedDataset && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            color: "var(--success-green)",
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            Dataset Loaded Successfully
          </div>
          <div style={{ fontSize: "0.825rem" }}>
            <strong>{uploadedDataset.filename}</strong> · {uploadedDataset.row_count.toLocaleString()} rows · {uploadedDataset.column_count} columns
          </div>
        </div>
      )}
    </div>
  );
}
