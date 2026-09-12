import React from "react";
import { getCountry, countryArtUrl } from "@/lib/covers/countries";

interface CountryCoverProps {
  /** country slug stored on the book */
  country?: string | null;
  /** book title — shown on the fallback cover (countries without art) */
  title?: string;
  /** show the book spine on the left edge (default true) */
  spine?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a travel photobook cover as a bound book (spine + face). Countries
 * with bundled art show the illustrated cover; the rest render a solid
 * spine-coloured face with the title.
 */
export default function CountryCover({
  country,
  title = "",
  spine = true,
  className,
  style,
}: CountryCoverProps) {
  const def = getCountry(country);
  const art = countryArtUrl(def);
  const spineColor = def?.spine ?? "#302b28";
  const ink = def?.ink ?? "#f3ead8";

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
      {art ? (
        <img
          src={art}
          alt={def ? `${def.name} photobook cover` : "photobook cover"}
          style={{ display: "block", flex: 1, minWidth: 0, width: "100%", height: "auto" }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            aspectRatio: "0.72",
            background: `linear-gradient(150deg, ${spineColor}, rgba(0,0,0,0.35))`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "14px 10px",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(13px, 4vw, 20px)",
              letterSpacing: "0.02em",
              color: ink,
              textAlign: "center",
              textTransform: "uppercase",
              lineHeight: 1.15,
            }}
          >
            {(def?.name || title || "your trip").toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
