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

const TITLE_FONT = "var(--font-cover-title)";
const DESC_FONT = "var(--font-gochi)";

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
  const bg = def?.bg ?? "#302b28";
  const spineColor = def?.spine ?? bg;
  const ink = def?.ink ?? "#f3ead8";

  const displayTitle = (title || def?.name || "your trip").toUpperCase();
  const displayDesc = description.trim();
  // Shrink the title for longer names so it stays on one line.
  const tl = displayTitle.length;
  const titleCqw = tl <= 6 ? 14 : tl <= 9 ? 11 : tl <= 12 ? 9 : 7.5;

  let face: React.ReactNode;

  if (stamp) {
    // Composite cover: solid bg + title + description + stamp (top to bottom),
    // matching the sample layout.
    face = (
      <div
        style={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          aspectRatio: "0.707",
          background: bg,
          containerType: "inline-size",
          overflow: "hidden",
        }}
      >
        {/* Title + description + stamp as one group, vertically centred on the face. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "11cqw",
            padding: "0 6%",
          }}
        >
          {/* Title wrapper keeps the title's position fixed regardless of the
              description; the description is taken out of flow (absolute) so it
              never re-centres the group or pulls the title toward the stamp. */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%" }}>
            <div
              style={{
                fontFamily: TITLE_FONT,
                fontWeight: 400,
                fontSize: `${titleCqw}cqw`,
                lineHeight: 1,
                letterSpacing: "0.01em",
                color: ink,
                textAlign: "center",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {displayTitle}
            </div>
            {displayDesc && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "2cqw",
                  width: "82cqw",
                  fontFamily: DESC_FONT,
                  fontSize: "4.5cqw",
                  lineHeight: 1.2,
                  color: ink,
                  opacity: 0.95,
                  textAlign: "center",
                }}
              >
                {displayDesc}
              </div>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stamp}
            alt={def ? `${def.name} stamp` : "stamp"}
            style={{ width: "38%", height: "auto", display: "block" }}
          />
        </div>
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
            fontFamily: TITLE_FONT,
            fontWeight: 400,
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
              fontFamily: DESC_FONT,
              fontSize: "4cqw",
              lineHeight: 1.2,
              color: ink,
              opacity: 0.95,
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
