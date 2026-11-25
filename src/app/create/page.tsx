"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import { rememberLastTrip } from "@/lib/lastTrip";
import Brand from "@/components/Brand";
import { validCoverSlug } from "@/lib/destinations";

export default function CreatePage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Step 1 is the cover. Arriving from a destination page (/create?cover=bali), the
    // cover is already chosen: the cover step saves it and hands straight off to the
    // photo step, leaving itself in history so "back" lands on the cover editor.
    // Read from location, not useSearchParams, so this page needs no Suspense boundary.
    const cover = validCoverSlug(new URLSearchParams(window.location.search).get("cover"));
    createTrip("Untitled Trip", "")
      .then((trip) => {
        rememberLastTrip(trip.id);
        if (cover) {
          try {
            sessionStorage.setItem(`atlaso_cover_pick_${trip.id}`, cover);
            sessionStorage.setItem(`atlaso_cover_handoff_${trip.id}`, "1");
          } catch { /* storage blocked: the cover step simply shows the pick preselected */ }
        }
        router.replace(`/trips/${trip.id}/cover`);
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
