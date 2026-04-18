"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createTrip } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function CreatePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trip = await createTrip(name.trim(), destination.trim());
      router.push(`/trips/${trip.id}/upload`);
    } catch {
      setError("Failed to create trip. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <AppShell maxWidth="480px">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: 36,
          fontWeight: 300,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          marginBottom: 8,
          lineHeight: 1.1,
        }}>
          Name your trip
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
          Give it a name so you can recognise it later.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-soft)", marginBottom: 8, fontWeight: 500 }}>
            Trip name <span style={{ color: "var(--blue)" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer in Portugal"
            required
            maxLength={100}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid rgba(10,26,58,0.2)",
              borderRadius: 10,
              fontSize: 15,
              background: "var(--white)",
              color: "var(--ink)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-soft)", marginBottom: 8, fontWeight: 500 }}>
            Destination <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Lisbon, Portugal"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid rgba(10,26,58,0.2)",
              borderRadius: 10,
              fontSize: 15,
              background: "var(--white)",
              color: "var(--ink)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "16px 28px",
            background: loading || !name.trim() ? "rgba(10,26,58,0.3)" : "var(--ink)",
            color: "var(--white)",
            border: "none",
            borderRadius: 100,
            fontSize: 15,
            fontWeight: 500,
            cursor: loading || !name.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Creating…" : "Continue to upload →"}
        </button>
      </form>
    </AppShell>
  );
}
