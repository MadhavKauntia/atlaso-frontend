import { getCountry, stampUrl, countryArtUrl } from "@/lib/covers/countries";

const COVER_W = 1414;
const COVER_H = 2000; // 0.707 portrait, matches the cover art
const DESC_FONT = "'Gochi Hand', 'Comic Sans MS', cursive";

/** Resolved Fraunces family (from next/font's CSS variable) for canvas rendering. */
function frauncesFamily(): string {
  if (typeof document === "undefined") return "Georgia, serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-fraunces").trim();
  return v ? `${v}, Georgia, serif` : "Georgia, serif";
}

/**
 * Renders the chosen cover to a print-ready PNG and returns the raw base64 (no
 * data-URL prefix), for POSTing to the backend export endpoint.
 * - stamp countries: solid bg + stamp + title + description (matches the UI)
 * - legacy jpg countries: the baked-text illustration as-is
 * - otherwise: a solid cover with the title
 */
export async function renderCountryCoverPng(
  country: string | null | undefined,
  title: string,
  description = ""
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const def = getCountry(country);
  const stamp = stampUrl(def);
  const art = countryArtUrl(def);

  const TITLE_FONT = frauncesFamily();
  // Ensure the cover fonts are loaded before drawing to canvas.
  await Promise.allSettled([
    document.fonts.load(`400 ${Math.round(COVER_H * 0.095)}px ${TITLE_FONT}`),
    document.fonts.load(`400 ${Math.round(COVER_H * 0.028)}px 'Gochi Hand'`),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  const displayTitle = (title || def?.name || "your trip").toUpperCase();
  const displayDesc = description.trim();

  if (stamp) {
    canvas.width = COVER_W;
    canvas.height = COVER_H;
    const bg = def?.bg ?? def?.spine ?? "#302b28";
    const ink = def?.ink ?? "#f3ead8";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    // title (top) — shrink for longer names
    const tl = displayTitle.length;
    const titleH = tl <= 6 ? 0.1 : tl <= 9 ? 0.078 : tl <= 12 ? 0.064 : 0.053;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 ${Math.round(COVER_H * titleH)}px ${TITLE_FONT}`;
    ctx.fillText(displayTitle, COVER_W / 2, COVER_H * 0.26, COVER_W * 0.82);

    // description (below title)
    if (displayDesc) {
      ctx.globalAlpha = 0.95;
      ctx.font = `400 ${Math.round(COVER_H * 0.03)}px ${DESC_FONT}`;
      ctx.fillText(displayDesc, COVER_W / 2, COVER_H * 0.315, COVER_W * 0.82);
      ctx.globalAlpha = 1;
    }

    // stamp illustration (bottom) — ~38% wide, top at 40%
    const img = await loadImage(stamp);
    const sw = COVER_W * 0.38;
    const sh = img.naturalHeight ? (sw / img.naturalWidth) * img.naturalHeight : sw / 0.809;
    ctx.drawImage(img, (COVER_W - sw) / 2, COVER_H * 0.4, sw, sh);
  } else if (art) {
    const img = await loadImage(art);
    canvas.width = img.naturalWidth || COVER_W;
    canvas.height = img.naturalHeight || COVER_H;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    canvas.width = COVER_W;
    canvas.height = COVER_H;
    const spineColor = def?.spine ?? "#302b28";
    const ink = def?.ink ?? "#f3ead8";
    const grad = ctx.createLinearGradient(0, 0, COVER_W, COVER_H);
    grad.addColorStop(0, spineColor);
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 ${Math.round(COVER_H * 0.1)}px ${TITLE_FONT}`;
    ctx.fillText(displayTitle, COVER_W / 2, COVER_H * 0.7, COVER_W * 0.82);
    if (displayDesc) {
      ctx.globalAlpha = 0.95;
      ctx.font = `400 ${Math.round(COVER_H * 0.028)}px ${DESC_FONT}`;
      ctx.fillText(displayDesc, COVER_W / 2, COVER_H * 0.77, COVER_W * 0.82);
      ctx.globalAlpha = 1;
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}

/**
 * Renders the hardcover BACK page — the cover's background colour with the atlaso
 * wordmark and URL centred in the lower third — as a print-ready PNG (base64, no
 * data-URL prefix). This becomes page 2 of the cover PDF.
 */
export async function renderCoverBackPng(country: string | null | undefined): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const def = getCountry(country);
  const bg = def?.bg ?? "#302b28";
  const ink = def?.ink ?? "#f3ead8";

  const font = frauncesFamily();
  await Promise.allSettled([
    document.fonts.load(`800 ${Math.round(COVER_H * 0.042)}px ${font}`),
    document.fonts.load(`400 ${Math.round(COVER_H * 0.02)}px ${font}`),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.font = `800 ${Math.round(COVER_H * 0.042)}px ${font}`;
  ctx.fillText("atlaso", COVER_W / 2, COVER_H * 0.79);

  ctx.font = `400 ${Math.round(COVER_H * 0.02)}px ${font}`;
  ctx.fillText("www.myatlaso.com", COVER_W / 2, COVER_H * 0.83);

  return canvas.toDataURL("image/png").split(",")[1];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
