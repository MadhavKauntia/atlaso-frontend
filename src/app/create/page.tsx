"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import Brand from "@/components/Brand";
import { validCoverSlug } from "@/lib/destinations";

export default function CreatePage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Arriving from a destination page (/create?cover=bali): remember the pick for
    // this trip so the cover step preselects it. Read from location, not
    // useSearchParams, so this page doesn't need a Suspense boundary.
    const cover = validCoverSlug(new URLSearchParams(window.location.search).get("cover"));
    createTrip("Untitled Trip", "")
      .then((trip) => {
        if (cover) {
          try { sessionStorage.setItem(`atlaso_cover_pick_${trip.id}`, cover); } catch { /* storage blocked */ }
        }
        router.replace(`/trips/${trip.id}/upload`);
      })
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
      <Brand dark height={30} href={null} />
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
