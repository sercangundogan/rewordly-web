import type { NextPageContext } from "next";
import Header from "../components/Header";

type ErrorProps = {
  statusCode?: number;
};

function Error({ statusCode }: ErrorProps) {
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
          {statusCode ?? "Error"}
        </h1>
        <p style={{ color: "#525252", lineHeight: 1.6 }}>
          {statusCode === 404
            ? "This page could not be found."
            : "Something went wrong. Please try again."}
        </p>
        <a
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
        </a>
      </main>
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
