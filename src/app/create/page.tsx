"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { googleAuth, createTrip } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E";

export default function CreatePage() {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<"loading" | "login" | "creating">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (getToken()) {
      setPhase("creating");
      createTrip("Untitled Trip", "")
        .then((trip) => router.replace(`/trips/${trip.id}/upload`))
        .catch(() => { setError("Something went wrong. Please try again."); setPhase("login"); });
    } else {
      setPhase("login");
    }
  }, [router]);

  const handleLogin = async (resp: CredentialResponse) => {
    if (!resp.credential) return;
    setPhase("creating");
    setError(null);
    try {
      const { token } = await googleAuth(resp.credential);
      setToken(token);
      const trip = await createTrip("Untitled Trip", "");
      router.replace(`/trips/${trip.id}/upload`);
    } catch {
      setError("Sign-in failed. Please try again.");
      setPhase("login");
    }
  };

  if (phase !== "login") {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--paper)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "var(--font-inter-tight, 'Inter Tight'), sans-serif",
      }}>
        <div style={{
          width: 40, height: 40,
          border: "2px solid rgba(10,26,58,0.12)", borderTopColor: "var(--blue)",
          borderRadius: "50%", animation: "spin 1s linear infinite",
        }} />
        {phase === "creating" && (
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>Setting up your workspace…</p>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-inter-tight, 'Inter Tight'), sans-serif",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.15, mixBlendMode: "multiply", backgroundImage: `url("${GRAIN}")` }} />

      <div style={{
        position: "relative", zIndex: 1,
        background: "#ffffff", borderRadius: 20,
        padding: "52px 56px", maxWidth: 440, width: "90%",
        textAlign: "center",
        boxShadow: "0 4px 40px rgba(10,26,58,0.08)",
        border: "1px solid rgba(10,26,58,0.07)",
      }}>
        <div style={{
          width: 48, height: 48, background: "var(--blue)", borderRadius: "50%",
          margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: "var(--font-fraunces), serif", fontSize: 32, fontWeight: 300,
          letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 12, lineHeight: 1.1,
        }}>
          Let's build your<br />
          <span style={{ fontStyle: "italic" }}>photobook</span>
        </h1>

        <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 36, lineHeight: 1.65 }}>
          Sign in to start — it takes one click, and your photos go nowhere without your say.
        </p>

        {error && (
          <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 20 }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <GoogleLogin
            onSuccess={handleLogin}
            onError={() => { setError("Sign-in failed. Please try again."); }}
            size="large"
            shape="pill"
            text="continue_with"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)", opacity: 0.7 }}>Free to preview</span>
          <span style={{ color: "var(--ink-soft)", opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 12, color: "var(--ink-soft)", opacity: 0.7 }}>Ships worldwide</span>
        </div>
      </div>
    </div>
  );
}
