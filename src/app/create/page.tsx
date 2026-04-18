"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function CreatePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    createTrip("Untitled Trip", "")
      .then((trip) => router.replace(`/trips/${trip.id}/upload`))
      .catch(() => router.replace("/login"));
  }, [ready, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: "2px solid rgba(10,26,58,0.12)",
        borderTopColor: "var(--blue)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
