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

const ACCENT_COLORS = ["#0f172a", "#0284c7", "#059669", "#d97706", "#7c3aed", "#db2777"];

export default function ChartVisualization({ result }: ChartVisualizationProps) {
  if (!result || !result.results) return null;

  const { results } = result;
  const chartType = (result.chart?.type || result.chart_type || "table").toLowerCase();

  // Safety Guard: Empty results or missing data
  if (
    !results.rows ||
    results.rows.length === 0 ||
    !results.columns ||
    results.columns.length === 0
  ) {
    return null;
  }

  const columns = results.columns;
  const rows = results.rows;

  // Intelligently identify Category (label) vs Numeric (metric) columns
  let catKey = columns[0] || "category";
  let numKey = columns[1] || columns[0] || "value";

  if (rows.length > 0 && columns.length >= 2) {
    const firstRow = rows[0];
    const val0 = firstRow[0];
    const val1 = firstRow[1];

    if (typeof val0 === "number" && (typeof val1 === "string" || val1 instanceof Date)) {
      catKey = columns[1];
      numKey = columns[0];
    } else if ((typeof val0 === "string" || val0 instanceof Date) && typeof val1 === "number") {
      catKey = columns[0];
      numKey = columns[1];
    }
  }

  const chartData = rows.map((row) => {
    const item: Record<string, any> = {};
    columns.forEach((col, idx) => {
      item[col] = row[idx];
    });
    return item;
  });

  // Truncate long category labels for Y-Axis tick formatting
  const formatYAxisTick = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val).trim();
    if (str.length > 22) {
      return str.substring(0, 20) + "...";
    }
    return str;
  };

  // Format tooltip numbers cleanly (currency/commas)
  const formatTooltipValue = (val: any) => {
    if (typeof val === "number") {
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  // 1. Single Metric KPI Stat Treatment
  if (
    chartType === "kpi" ||
    (rows.length === 1 &&
      columns.length <= 2 &&
      typeof rows[0][columns.length - 1] === "number")
  ) {
    const kpiVal = rows[0][columns.length - 1];
    const kpiLabel = columns[columns.length - 1];
    const formattedVal =
      typeof kpiVal === "number"
        ? kpiVal >= 1000000
          ? `$${(kpiVal / 1000000).toFixed(1)}M`
          : kpiVal >= 1000
          ? kpiVal.toLocaleString()
          : kpiVal.toString()
        : String(kpiVal);

    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
          {kpiLabel}
        </div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {formattedVal}
        </div>
      </div>
    );
  }

  // 2. Line Chart View (Time Series)
  if (chartType === "line") {
    return (
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          {numKey} trend over {catKey}
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey={catKey} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "var(--text-primary)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey={numKey}
                stroke="var(--accent-blue)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent-blue)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 3. Pie / Donut Chart View
  if (chartType === "pie") {
    return (
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Distribution of {numKey} by {catKey}
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "var(--text-primary)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Pie
                data={chartData}
                dataKey={numKey}
                nameKey={catKey}
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={50}
                paddingAngle={2}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={ACCENT_COLORS[index % ACCENT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 4. Horizontal Bar Chart View (Rankings & Category Comparison)
  if (chartType === "bar" || (columns.length === 2 && chartType !== "table")) {
    const chartHeight = Math.max(260, rows.length * 48);

    return (
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          {numKey} by {catKey}
        </div>
        <div style={{ width: "100%", height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--text-secondary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (typeof v === "number" && v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <YAxis
                type="category"
                dataKey={catKey}
                stroke="var(--text-primary)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxisTick}
                interval={0}
                width={135}
              />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "var(--text-primary)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey={numKey} fill="var(--text-primary)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Fallback (Table handles multi-column raw records)
  return null;
}
