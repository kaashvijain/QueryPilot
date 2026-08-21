"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface QueryResultsPayload {
  columns: string[];
  rows: any[][];
  row_count: number;
  execution_time_ms: number;
}

interface QueryResponse {
  dataset_id: string;
  question: string;
  sql: string;
  explanation: string;
  chart_type?: string;
  chart?: { type: string };
  attempts: number;
  results: QueryResultsPayload;
  success?: boolean;
  error_message?: string | null;
}

interface ChartVisualizationProps {
  result: QueryResponse | null;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function ChartVisualization({ result }: ChartVisualizationProps) {
  if (!result || !result.results) return null;

  const { results, explanation } = result;
  const chartType = (result.chart?.type || result.chart_type || "table").toLowerCase();

  // Safety Guard: Empty results or missing data
  if (
    !results.rows ||
    results.rows.length === 0 ||
    !results.columns ||
    results.columns.length === 0
  ) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px dashed #cbd5e1",
          color: "#64748b",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          No data available to generate visualization.
        </p>
      </div>
    );
  }

  // Formatting rows into Recharts object array
  const columns = results.columns;
  const rows = results.rows;

  const xKey = columns[0] || "category";
  const yKey = columns[1] || columns[0] || "value";

  const chartData = rows.map((row) => {
    const item: Record<string, any> = {};
    columns.forEach((col, idx) => {
      item[col] = row[idx];
    });
    return item;
  });

  // KPI Card View
  if (
    chartType === "kpi" ||
    (rows.length === 1 &&
      columns.length <= 2 &&
      typeof rows[0][columns.length - 1] === "number")
  ) {
    const kpiVal = rows[0][columns.length - 1];
    const kpiLabel = columns[columns.length - 1];
    const formattedVal =
      typeof kpiVal === "number" ? kpiVal.toLocaleString() : String(kpiVal);

    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}
        >
          {kpiLabel}
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
          {formattedVal}
        </div>
        {explanation && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "#475569",
              marginTop: "0.75rem",
              fontStyle: "italic",
            }}
          >
            {explanation}
          </div>
        )}
      </div>
    );
  }

  // Line Chart View
  if (chartType === "line") {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem",
          }}
        >
          Line Trend Chart ({xKey} vs {yKey})
        </div>
        <div
          style={{
            width: "100%",
            height: 300,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1rem 0",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "6px",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#38bdf8" }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#2563eb" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Pie Chart View
  if (chartType === "pie") {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem",
          }}
        >
          Proportion Breakdown ({xKey} vs {yKey})
        </div>
        <div
          style={{
            width: "100%",
            height: 300,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1rem 0",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "6px",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Pie
                data={chartData}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Scatter Plot View
  if (chartType === "scatter") {
    const xCol = columns.length >= 3 ? columns[1] : columns[0];
    const yCol = columns.length >= 3 ? columns[2] : columns[1];
    const labelCol = columns.length >= 3 ? columns[0] : "";

    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem",
          }}
        >
          Scatter Comparison Plot ({xCol} vs {yCol})
        </div>
        <div
          style={{
            width: "100%",
            height: 300,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1rem 0",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xCol} stroke="#64748b" fontSize={12} tickLine={false} name={xCol} />
              <YAxis dataKey={yCol} stroke="#64748b" fontSize={12} tickLine={false} name={yCol} />
              {labelCol && <ZAxis dataKey={labelCol} name={labelCol} />}
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "6px",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#38bdf8" }}
              />
              <Scatter name="Data Points" data={chartData} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Bar Chart View (Default for bar or unrecognized chart_type with 2 columns)
  if (chartType === "bar" || (columns.length === 2 && chartType !== "table")) {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem",
          }}
        >
          Bar Distribution Chart ({xKey} vs {yKey})
        </div>
        <div
          style={{
            width: "100%",
            height: 300,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1rem 0",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "6px",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#38bdf8" }}
              />
              <Bar dataKey={yKey} fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Fallback to table visualization
  return null;
}
