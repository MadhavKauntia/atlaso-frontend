"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, removeToken } from "@/lib/auth";
import { getTrips, deleteTripById, type Trip } from "@/lib/api";

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.18'/%3E%3C/svg%3E";

function resumeUrl(trip: Trip): string {
  return trip.status === "BOOK_GENERATED"
    ? `/trips/${trip.id}/preview`
    : `/trips/${trip.id}/upload`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "CREATED": return "Not started";
    case "UPLOADING_PHOTOS": return "Uploading photos";
    case "ANALYZING_PHOTOS": return "Analyzing photos";
    case "READY_FOR_BOOK_GENERATION": return "Ready to generate";
    default: return status;
  }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/account");
      return;
    }
    getTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async (tripId: string) => {
    if (!confirm("Delete this design? This cannot be undone.")) return;
    try {
      await deleteTripById(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch {
      alert("Failed to delete. Please try again.");
    }
  };

  const handleSignOut = () => {
    removeToken();
    router.push("/");
  };

  const inProgress = trips.filter((t) => t.status !== "BOOK_GENERATED");
  const books = trips.filter((t) => t.status === "BOOK_GENERATED");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "var(--font-inter-tight, 'Inter Tight'), sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, opacity: 0.15, mixBlendMode: "multiply", backgroundImage: `url("${GRAIN}")` }} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "52px 32px 80px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 52 }}>
          <Link href="/" style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, background: "var(--blue)", borderRadius: "50%", display: "inline-block" }} />
            Atlaso
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/create" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "var(--ink)", color: "#fff", borderRadius: 100, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              + New book
            </Link>
            <button onClick={handleSignOut} style={{ background: "none", border: "none", fontSize: 13, color: "var(--ink-soft)", cursor: "pointer", padding: 0 }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Page title */}
        <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 300, fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1, letterSpacing: "-0.03em", color: "var(--ink)", margin: "0 0 52px" }}>
          Your <span style={{ fontStyle: "italic", color: "var(--blue)" }}>designs.</span>
        </h1>

        {loading && (
          <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>Loading…</p>
        )}

        {!loading && trips.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic", fontSize: 22, color: "var(--ink-soft)", marginBottom: 28 }}>
              No designs yet.
            </p>
            <Link href="/create" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 30px", background: "var(--ink)", color: "#fff", borderRadius: 100, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Start your first book →
            </Link>
          </div>
        )}

        {!loading && inProgress.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 16 }}>
              In progress
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inProgress.map((trip) => (
                <TripCard key={trip.id} trip={trip} onDelete={handleDelete} actionLabel="Resume" />
              ))}
            </div>
          </section>
        )}

        {!loading && books.length > 0 && (
          <section>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 500, color: "var(--blue)", marginBottom: 16 }}>
              Your books
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {books.map((trip) => (
                <TripCard key={trip.id} trip={trip} onDelete={handleDelete} actionLabel="View" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TripCard({
  trip,
  onDelete,
  actionLabel,
}: {
  trip: Trip;
  onDelete: (id: string) => void;
  actionLabel: "Resume" | "View";
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "18px 22px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 1px 3px rgba(10,26,58,0.07), 0 4px 12px rgba(10,26,58,0.04)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-fraunces), serif",
          fontSize: 17, fontWeight: 500,
          color: "var(--ink)", marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {trip.name}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          {trip.destination && <span>{trip.destination}</span>}
          {trip.createdAt && <span>{fmt(trip.createdAt)}</span>}
          {actionLabel === "Resume" && (
            <span style={{ color: "var(--blue)", fontWeight: 500 }}>
              {statusLabel(trip.status)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link
          href={resumeUrl(trip)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px",
            background: "var(--ink)", color: "#fff",
            borderRadius: 100, fontSize: 13, fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {actionLabel} →
        </Link>
        <button
          onClick={() => onDelete(trip.id)}
          title="Delete"
          style={{
            width: 34, height: 34,
            background: "none", border: "1px solid rgba(10,26,58,0.15)",
            borderRadius: "50%", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-soft)", fontSize: 13,
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "rgba(185,28,28,0.08)";
            b.style.color = "#b91c1c";
            b.style.borderColor = "rgba(185,28,28,0.3)";
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "none";
            b.style.color = "var(--ink-soft)";
            b.style.borderColor = "rgba(10,26,58,0.15)";
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
