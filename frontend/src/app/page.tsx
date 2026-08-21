"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar, { ViewTab } from "@/components/Navbar";
import DatasetUpload from "@/components/DatasetUpload";
import DatasetBanner from "@/components/DatasetBanner";
import QueryInput from "@/components/QueryInput";
import QueryResult from "@/components/QueryResult";
import HistoryView, { saveToHistory, HistoryItem } from "@/components/HistoryView";
import DatasetView from "@/components/DatasetView";

interface DatasetMetadata {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
}

function MainDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentViewParam = (searchParams.get("view") as ViewTab) || "analyze";
  const [activeView, setActiveView] = useState<ViewTab>(currentViewParam);
  const [activeDataset, setActiveDataset] = useState<DatasetMetadata | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [activeQuestionText, setActiveQuestionText] = useState<string>("");
  const [isQueryCollapsed, setIsQueryCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const view = searchParams.get("view") as ViewTab;
    if (view && ["analyze", "history", "dataset"].includes(view)) {
      setActiveView(view);
    }
  }, [searchParams]);

  const handleSelectView = (view: ViewTab) => {
    setActiveView(view);
    router.push(`/?view=${view}`);
  };

  const handleUploadSuccess = (id: string, metadata?: { filename: string; rows: number; columns: number }) => {
    const dsMeta: DatasetMetadata = {
      dataset_id: id,
      filename: metadata?.filename || "dataset.csv",
      rows: metadata?.rows || 0,
      columns: metadata?.columns || 0,
    };
    setActiveDataset(dsMeta);
    setQueryResult(null);
    setIsQueryCollapsed(false);
    setActiveQuestionText("");
  };

  const handleQuerySuccess = (result: any) => {
    setQueryResult(result);
    setActiveQuestionText(result.question || "");
    setIsQueryCollapsed(true); // Collapse query input into top context header post-analysis

    if (result && result.question && result.sql && activeDataset) {
      saveToHistory({
        datasetId: activeDataset.dataset_id,
        datasetName: activeDataset.filename,
        question: result.question,
        sql: result.sql,
        insight: result.insight || result.explanation,
        chartType: result.chart?.type || result.chart_type || "table",
        rowCount: result.results?.row_count || 0,
        columns: result.results?.columns || [],
        previewRows: result.results?.rows ? result.results.rows.slice(0, 5) : [],
      });
    }
  };

  const handleEditQuestion = (qText: string) => {
    setActiveQuestionText(qText);
    setIsQueryCollapsed(false);
  };

  const handleNewQuery = () => {
    setQueryResult(null);
    setActiveQuestionText("");
    setIsQueryCollapsed(false);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setQueryResult({
      dataset_id: item.datasetId,
      question: item.question,
      sql: item.sql,
      explanation: item.insight || "",
      insight: item.insight,
      attempts: 1,
      results: {
        columns: item.columns || [],
        rows: item.previewRows || [],
        row_count: item.rowCount || 0,
        execution_time_ms: 0,
      },
      chart_type: item.chartType,
      success: true,
    });
    setActiveQuestionText(item.question);
    setIsQueryCollapsed(true);
    handleSelectView("analyze");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Navigation Header */}
      <Navbar
        activeView={activeView}
        onSelectView={handleSelectView}
        dataset={activeDataset}
      />

      {/* Main Workspace Container */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "2rem 1.5rem 4rem",
        }}
      >
        {/* Analyze View */}
        {activeView === "analyze" && (
          <div>
            {!activeDataset ? (
              <div style={{ maxWidth: "680px", margin: "2rem auto 0" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    Upload your data. Ask a question. Understand the answer.
                  </h2>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                    QueryPilot transforms your CSV datasets into schema-aware SQL, interactive visualizations, and plain-English business insights.
                  </p>
                </div>
                <DatasetUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            ) : (
              <div>
                <DatasetBanner
                  dataset={activeDataset}
                  onChangeDataset={() => {
                    setActiveDataset(null);
                    setQueryResult(null);
                    setIsQueryCollapsed(false);
                  }}
                />

                <QueryInput
                  datasetId={activeDataset.dataset_id}
                  activeQuestion={activeQuestionText}
                  isCollapsed={isQueryCollapsed}
                  onQuerySuccess={handleQuerySuccess}
                  onEditQuestion={handleEditQuestion}
                  onNewQuery={handleNewQuery}
                />

                {queryResult && <QueryResult result={queryResult} />}
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {activeView === "history" && (
          <HistoryView
            activeDatasetId={activeDataset?.dataset_id || null}
            onSelectQuery={handleSelectHistoryItem}
            onRerunQuery={(q) => {
              setActiveQuestionText(q);
              setIsQueryCollapsed(false);
              handleSelectView("analyze");
            }}
          />
        )}

        {/* Dataset View */}
        {activeView === "dataset" && (
          <DatasetView
            dataset={activeDataset}
            onUploadClick={() => handleSelectView("analyze")}
          />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading QueryPilot...</div>}>
      <MainDashboardContent />
    </Suspense>
  );
}
