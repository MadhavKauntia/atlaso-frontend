"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const draftId = crypto.randomUUID();
    sessionStorage.setItem("atlaso_draft_id", draftId);
    router.replace(`/trips/${draftId}/upload`);
  }, [router]);

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
