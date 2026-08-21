import DatasetUpload from "@/components/DatasetUpload";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#ffffff",
        color: "#111111",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "3rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "800px", width: "100%", textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
          QueryPilot
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#475569" }}>
          AI-Powered Natural Language Analytics Platform
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "600px" }}>
        <DatasetUpload />
      </div>
    </main>
  );
}
