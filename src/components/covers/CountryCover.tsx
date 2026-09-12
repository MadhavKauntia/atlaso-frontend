import React from "react";
import { getCountry, stampUrl, countryArtUrl } from "@/lib/covers/countries";

interface CountryCoverProps {
  /** country slug stored on the book */
  country?: string | null;
  /** book title — the large text on the cover (defaults to the country name) */
  title?: string;
  /** optional description shown beneath the title */
  description?: string;
  /** show the book spine on the left edge (default true) */
  spine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SERIF = "var(--font-fraunces), Georgia, serif";

/**
 * Renders a travel photobook cover as a bound book (spine + face).
 * - Countries with a text-free `stamp`: solid background + stamp + dynamic
 *   title & description.
 * - Countries with only a legacy baked-text `art` jpg: the jpg as-is.
 * - Otherwise: a solid spine-coloured face with the title.
 */
export default function CountryCover({
  country,
  title = "",
  description = "",
  spine = true,
  className,
  style,
}: CountryCoverProps) {
  const def = getCountry(country);
  const stamp = stampUrl(def);
  const art = countryArtUrl(def);
  const spineColor = def?.spine ?? "#302b28";
  const ink = def?.ink ?? "#f3ead8";
  const bg = def?.bg ?? spineColor;

  const displayTitle = (title || def?.name || "your trip").toUpperCase();
  const displayDesc = description.trim();

  let face: React.ReactNode;

  if (stamp) {
    // Composite cover: solid bg + stamp + dynamic title & description.
    face = (
      <div
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          aspectRatio: "0.707",
          background: bg,
          containerType: "inline-size",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "6% 8% 8%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            fontFamily: SERIF,
            fontSize: "5cqw",
            letterSpacing: "0.02em",
            color: ink,
            opacity: 0.85,
          }}
        >
          atlaso
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stamp}
          alt={def ? `${def.name} stamp` : "stamp"}
          style={{ width: "62%", height: "auto", marginTop: "3%", display: "block" }}
        />
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: "15cqw",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            color: ink,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {displayTitle}
        </div>
        {displayDesc && (
          <div
            style={{
              marginTop: "3.5%",
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "5.5cqw",
              lineHeight: 1.2,
              color: ink,
              opacity: 0.9,
              textAlign: "center",
            }}
          >
            {displayDesc}
          </div>
        )}
        <div style={{ height: "6%" }} />
      </div>
    );
  } else if (art) {
    // Legacy baked-text jpg — shown as-is until a stamp is provided.
    // eslint-disable-next-line @next/next/no-img-element
    face = (
      <img
        src={art}
        alt={def ? `${def.name} photobook cover` : "photobook cover"}
        style={{ display: "block", flex: 1, minWidth: 0, width: "100%", height: "auto" }}
      />
    );
  } else {
    // Solid fallback cover.
    face = (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          aspectRatio: "0.707",
          background: `linear-gradient(150deg, ${spineColor}, rgba(0,0,0,0.35))`,
          containerType: "inline-size",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "14% 8% 10%",
          boxSizing: "border-box",
          gap: "3.5%",
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: "15cqw",
            lineHeight: 1.02,
            color: ink,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {displayTitle}
        </div>
        {displayDesc && (
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "5.5cqw",
              lineHeight: 1.2,
              color: ink,
              opacity: 0.9,
              textAlign: "center",
            }}
          >
            {displayDesc}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        boxShadow: "10px 14px 0 rgba(38,34,32,0.18)",
        borderRadius: "2px 6px 6px 2px",
        overflow: "hidden",
        background: spineColor,
        ...style,
      }}
    >
      {spine && (
        <div
          style={{
            flex: "none",
            width: "5.5%",
            minWidth: 6,
            background: spineColor,
            borderRight: "1px solid rgba(0,0,0,0.18)",
          }}
        />
      )}
      {face}
    </div>
  );
}
