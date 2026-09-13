"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeToken, getCachedUser } from "@/lib/auth";
import { getTrips, getMe, deleteTripById, type Trip, type User } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Footer from "@/components/Footer";
import Brand from "@/components/Brand";
import FullPageLoader from "@/components/FullPageLoader";

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
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [user, setUser] = useState<User | null>(getCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    getMe().then(setUser).catch(() => {});
    getTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready]);

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

  // Never render the page (or a blank screen) while the auth check is pending —
  // show a clean loader until we know the user is signed in, otherwise redirect.
  if (!ready) return <FullPageLoader />;

  const inProgress = trips.filter((t) => t.status !== "BOOK_GENERATED" && t.status !== "ORDERED");
  const pendingDesigns = trips.filter((t) => t.status === "BOOK_GENERATED");
  const completedOrders = trips.filter((t) => t.status === "ORDERED");
  const hasAny = trips.length > 0;

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--sb-bg)",
      // Same very light graph-paper grid as the landing hero.
      backgroundImage:
        "linear-gradient(rgba(243, 234, 216, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(243, 234, 216, 0.035) 1px, transparent 1px)",
      backgroundSize: "46px 46px",
      color: "var(--sb-cream)",
      fontFamily: "var(--font-dm-sans), sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top bar — white atlaso header with sign-out */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid #ece5d8",
          padding: "14px clamp(16px, 3vw, 34px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Brand height={26} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Link
            href="/create"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sb-ink)",
              background: "var(--sb-gold)",
              padding: "8px 14px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            new book ›
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 500,
              fontSize: 14,
              color: "#4a443e",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            sign out
          </button>
        </div>
      </header>

      {/* Profile header */}
      <section
        style={{
          padding: "clamp(40px, 5vw, 72px) clamp(20px, 5vw, 64px) clamp(28px, 3vw, 40px)",
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 999,
              background: "var(--sb-gold)",
              color: "var(--sb-ink)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-bricolage), sans-serif",
              fontWeight: 800,
              fontSize: 24,
            }}
          >
            {userInitials(user)}
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 3.2vw, 40px)",
                letterSpacing: "-0.03em",
                margin: 0,
                color: "var(--sb-cream)",
              }}
            >
              {user?.name ? `${firstName(user.name)}'s travels` : "your travels"}
            </h1>
            <div style={{ fontSize: 14, color: "var(--sb-muted-2)", marginTop: 4 }}>
              {hasAny
                ? `${trips.length} book${trips.length === 1 ? "" : "s"} in the works · keep the memories in print`
                : "start your first travel photobook"}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section
        style={{
          padding: "0 clamp(20px, 5vw, 64px) clamp(48px, 6vw, 88px)",
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
          flex: 1,
        }}
      >
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <span
              style={{
                width: 34,
                height: 34,
                border: "3px solid var(--sb-panel-2)",
                borderTopColor: "var(--sb-gold)",
                borderRadius: "50%",
                animation: "accountSpin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes accountSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && !hasAny && (
          <div
            style={{
              background: "var(--sb-panel)",
              borderRadius: 18,
              padding: "clamp(40px, 6vw, 72px) 28px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 18, color: "var(--sb-muted)", margin: "0 0 24px" }}>
              No books yet. Your travels are waiting to be printed.
            </p>
            <Link href="/create" style={primaryBtn}>
              Start your first book →
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {!loading && inProgress.length > 0 && (
            <div>
              <SectionTitle>in progress</SectionTitle>
              <div style={{ display: "grid", gap: 12 }}>
                {inProgress.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onDelete={handleDelete} actionLabel="Resume" href={resumeUrl(trip)} />
                ))}
              </div>
            </div>
          )}

          {!loading && pendingDesigns.length > 0 && (
            <div>
              <SectionTitle>ready to order</SectionTitle>
              <p style={{ fontSize: 14, color: "var(--sb-muted-2)", margin: "-4px 0 12px" }}>
                Review your book and place your order when you&apos;re happy with it.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                {pendingDesigns.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onDelete={handleDelete} actionLabel="Review" href={`/trips/${trip.id}/preview`} />
                ))}
              </div>
            </div>
          )}

          {!loading && completedOrders.length > 0 && (
            <div>
              <SectionTitle>your library</SectionTitle>
              <div style={{ display: "grid", gap: 12 }}>
                {completedOrders.map((trip) => (
                  <OrderCard key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-bricolage), sans-serif",
  fontWeight: 800,
  fontSize: 14,
  color: "var(--sb-cream)",
  background: "var(--sb-red)",
  padding: "13px 24px",
  borderRadius: 999,
  textDecoration: "none",
};

const goldBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-bricolage), sans-serif",
  fontWeight: 800,
  fontSize: 14,
  color: "var(--sb-ink)",
  background: "var(--sb-gold)",
  padding: "11px 18px",
  borderRadius: 999,
  textDecoration: "none",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function userInitials(user: User | null): string {
  const name = user?.name?.trim();
  if (name) {
    const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
    if (letters) return letters.toUpperCase();
  }
  return "AT";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-dm-sans), sans-serif",
        fontWeight: 700,
        fontSize: 21,
        letterSpacing: "-0.02em",
        margin: "0 0 12px",
        color: "var(--sb-cream)",
      }}
    >
      {children}
    </h2>
  );
}

function TripCard({
  trip,
  onDelete,
  actionLabel,
  href,
}: {
  trip: Trip;
  onDelete: (id: string) => void;
  actionLabel: "Resume" | "Review";
  href: string;
}) {
  return (
    <div
      style={{
        background: "var(--sb-panel)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Spine + cover placeholder */}
      <div
        style={{
          flex: "none",
          display: "flex",
          width: 66,
          height: 84,
          borderRadius: "2px 4px 4px 2px",
          overflow: "hidden",
          boxShadow: "4px 6px 0 rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ flex: "none", width: 6, background: "var(--sb-orange)" }} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "var(--sb-panel-2)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-bricolage), sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: "var(--sb-muted)",
          }}
        >
          {(trip.name?.[0] ?? "?").toUpperCase()}
        </div>
      </div>

      <div style={{ flex: "1 1 150px", minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontWeight: 700,
            fontSize: 17,
            color: "var(--sb-cream)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {trip.name}
        </div>
        <div style={{ fontSize: 13, color: "var(--sb-muted-2)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {trip.destination && <span>{trip.destination}</span>}
          {trip.createdAt && <span>{fmt(trip.createdAt)}</span>}
          {actionLabel === "Resume" && (
            <span style={{ color: "var(--sb-gold)", fontWeight: 600 }}>{statusLabel(trip.status)}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Link href={href} style={goldBtn}>
          {actionLabel} →
        </Link>
        <DeleteButton onClick={() => onDelete(trip.id)} />
      </div>
    </div>
  );
}

function OrderCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trips/${trip.id}/confirmation`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "var(--sb-panel)",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          transition: "background 160ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sb-panel-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--sb-panel)")}
      >
        <div
          style={{
            flex: "none",
            display: "flex",
            width: 66,
            height: 84,
            borderRadius: "2px 4px 4px 2px",
            overflow: "hidden",
            boxShadow: "4px 6px 0 rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ flex: "none", width: 6, background: "var(--sb-green)" }} />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--sb-panel-2)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-bricolage), sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: "var(--sb-muted)",
            }}
          >
            {(trip.name?.[0] ?? "?").toUpperCase()}
          </div>
        </div>

        <div style={{ flex: "1 1 150px", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "var(--sb-cream)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {trip.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--sb-muted-2)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {trip.destination && <span>{trip.destination}</span>}
            {trip.createdAt && <span>{fmt(trip.createdAt)}</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--sb-green)", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sb-green)", display: "inline-block" }} />
              Order placed
            </span>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "var(--sb-muted)", flexShrink: 0, fontWeight: 600 }}>
          View order →
        </div>
      </div>
    </Link>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Delete"
      style={{
        width: 36,
        height: 36,
        background: "none",
        border: "1px solid var(--sb-panel-2)",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--sb-muted)",
        fontSize: 13,
        transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "rgba(201,53,44,0.15)";
        b.style.color = "var(--sb-red)";
        b.style.borderColor = "var(--sb-red)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "none";
        b.style.color = "var(--sb-muted)";
        b.style.borderColor = "var(--sb-panel-2)";
      }}
    >
      ✕
    </button>
  );
}
