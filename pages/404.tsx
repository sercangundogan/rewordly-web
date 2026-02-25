import Header from "../components/Header";
import Link from "next/link";

export default function Custom404() {
  return (
    <>
      <Header />
      <main
        style={{
          padding: "120px 24px 80px",
          maxWidth: 560,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", marginBottom: 12 }}>
          404
        </h1>
        <p style={{ color: "#525252", lineHeight: 1.6 }}>
          This page could not be found.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "12px 28px",
            background: "#0a0a0a",
            color: "#fff",
            borderRadius: 50,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to home
        </Link>
      </main>
    </>
  );
}
