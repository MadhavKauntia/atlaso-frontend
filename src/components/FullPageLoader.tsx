"use client";

/**
 * Branded full-screen loader shown while an auth check is in flight, so
 * protected pages never flash their content (or a blank screen) before a
 * redirect to /login resolves.
 */
export default function FullPageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sb-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          border: "3px solid var(--sb-panel-2)",
          borderTopColor: "var(--sb-gold)",
          borderRadius: "50%",
          animation: "fullPageSpin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes fullPageSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
