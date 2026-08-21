export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        color: "#111111",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        QueryPilot
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#444444", maxWidth: "600px" }}>
        AI-Powered Natural Language Analytics Platform
      </p>
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem 1.5rem",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9",
          color: "#333333",
          fontSize: "0.95rem",
        }}
      >
        Frontend & Backend monorepo structure initialized successfully.
      </div>
    </main>
  );
}
