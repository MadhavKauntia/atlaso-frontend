"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";

export default function CreatePage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createTrip("Untitled Trip", "")
      .then((trip) => router.replace(`/trips/${trip.id}/upload`))
      .catch(() => router.replace("/"));
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--sb-bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 22,
      color: "var(--sb-cream)",
    }}>
      <div style={{
        fontFamily: "var(--font-nunito), sans-serif",
        fontWeight: 800,
        fontSize: 26,
        letterSpacing: "-0.02em",
        color: "var(--sb-cream)",
      }}>
        atlaso<span style={{ color: "var(--sb-orange)" }}>.</span>
      </div>
      <div style={{
        width: 40, height: 40,
        border: "3px solid var(--sb-panel-2)",
        borderTopColor: "var(--sb-gold)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <div style={{
        fontFamily: "var(--font-dm-sans), sans-serif",
        fontSize: 14,
        color: "var(--sb-muted)",
        letterSpacing: "-0.01em",
      }}>
        setting up your trip…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
