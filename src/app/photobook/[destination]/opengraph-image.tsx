import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { getCountry } from "@/lib/covers/countries";
import { BOOK_PAGES, BOOK_PRICE_INR } from "@/lib/site";

// Share preview (WhatsApp, Instagram, X, search) for each destination page:
// the destination's cover colour and stamp, with the book's name and price.
// The price is written "Rs." because the built-in OG font has no ₹ glyph.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "An Atlaso travel photo book with an illustrated destination cover";

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ destination: d.path }));
}

export default async function Image({ params }: { params: Promise<{ destination: string }> }) {
  const d = getDestination((await params).destination);
  const country = getCountry(d?.cover);
  const name = d?.name ?? "Your trip";
  const bg = country?.bg ?? "#262220";
  const ink = country?.ink ?? "#f3ead8";

  let stamp: string | null = null;
  if (country?.stamp) {
    const png = await readFile(join(process.cwd(), "public/assets/stamps", `${country.stamp}.png`));
    stamp = `data:image/png;base64,${png.toString("base64")}`;
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1c1a18", padding: 56 }}>
        {/* the book cover */}
        <div
          style={{
            width: 400,
            height: 518,
            background: bg,
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "40px 32px 34px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
          }}
        >
          {stamp ? (
            <img src={stamp} width={250} height={309} alt="" style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ width: 250, height: 309 }} />
          )}
          <div style={{ color: ink, fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>{name}</div>
        </div>

        {/* the copy */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 64, color: "#f3ead8" }}>
          <div style={{ fontSize: 30, color: "#f3b53f", fontWeight: 700, marginBottom: 18 }}>Atlaso</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{`${name} photo book`}</div>
          <div style={{ fontSize: 30, marginTop: 26, color: "#cfc4b2", lineHeight: 1.35 }}>
            {`${BOOK_PAGES} pages · B5 · hardcover`}
          </div>
          <div style={{ fontSize: 30, marginTop: 8, color: "#cfc4b2" }}>
            {`Rs. ${BOOK_PRICE_INR.toLocaleString("en-IN")}, shipping included`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
