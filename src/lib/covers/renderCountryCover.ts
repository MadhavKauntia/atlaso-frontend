import { getCountry, stampUrl, countryArtUrl, coverColors } from "@/lib/covers/countries";

const COVER_W = 1414;
const COVER_H = 2000; // 0.707 portrait, matches the cover art
const DESC_FONT = "'Gochi Hand', 'Comic Sans MS', cursive";

/**
 * Loads a font face and resolves only once the browser confirms it's ready to
 * paint (`document.fonts.check`). Retries briefly to ride out a slow woff2 fetch,
 * then falls back to `document.fonts.ready`. Prevents the canvas from drawing with
 * a fallback font (e.g. Comic Sans standing in for Gochi Hand, which reads bold).
 */
async function ensureFont(spec: string): Promise<void> {
  try {
    await document.fonts.load(spec);
    for (let i = 0; i < 20; i++) {
      if (document.fonts.check(spec)) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    await document.fonts.ready;
  } catch {
    // Best-effort: fall through and let the canvas draw with whatever is available.
  }
}

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
  description = "",
  bgOverride?: string | null
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const def = getCountry(country);
  const stamp = stampUrl(def);
  const art = countryArtUrl(def);
  const colors = coverColors(country, bgOverride);

  const TITLE_FONT = "'Aloja', 'Roboto Serif', Georgia, serif";
  // Ensure the cover fonts are actually loaded before drawing to canvas. A plain
  // `document.fonts.load` + allSettled only *waits*; it doesn't verify the face is
  // ready, so a slow/failed woff2 fetch would silently draw the description in the
  // Comic Sans fallback (looks bold). Load, then poll `check` so we only proceed
  // once the face is genuinely available.
  await Promise.all([
    ensureFont(`400 ${Math.round(COVER_H * 0.095)}px 'Aloja'`),
    ensureFont(`400 ${Math.round(COVER_H * 0.028)}px 'Gochi Hand'`),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  const displayTitle = (title || def?.name || "your trip").toUpperCase();
  const displayDesc = description.trim();

  if (stamp) {
    canvas.width = COVER_W;
    canvas.height = COVER_H;
    const bg = colors.bg;
    const ink = colors.ink;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    // Load the stamp first so the whole title + description + stamp group can be
    // vertically centred on the face (was previously anchored toward the top).
    const img = await loadImage(stamp);
    const sw = COVER_W * 0.38;
    const sh = img.naturalHeight ? (sw / img.naturalWidth) * img.naturalHeight : sw / 0.809;

    // title size — shrink for longer names
    const tl = displayTitle.length;
    const titleH = tl <= 6 ? 0.1 : tl <= 9 ? 0.078 : tl <= 12 ? 0.064 : 0.053;
    const titlePx = Math.round(COVER_H * titleH);
    const descPx = Math.round(COVER_H * 0.026);
    const gapTitleDesc = COVER_H * 0.014; // ~2cqw, matches the preview
    const gapTextStamp = COVER_H * 0.078; // ~11cqw, matches the preview

    // Anchor the title and stamp where they sit when there is NO description
    // (the title + stamp group centred on the face). The description then sits
    // in the gap between them without moving either — the title never shifts.
    const anchorH = titlePx + gapTextStamp + sh;
    const titleTop = (COVER_H - anchorH) / 2;
    const titleBottom = titleTop + titlePx;
    const stampY = titleBottom + gapTextStamp;

    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.font = `400 ${titlePx}px ${TITLE_FONT}`;
    ctx.fillText(displayTitle, COVER_W / 2, titleTop, COVER_W * 0.82);

    if (displayDesc) {
      ctx.globalAlpha = 0.95;
      ctx.font = `400 ${descPx}px ${DESC_FONT}`;
      ctx.fillText(displayDesc, COVER_W / 2, titleBottom + gapTitleDesc, COVER_W * 0.82);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(img, (COVER_W - sw) / 2, stampY, sw, sh);
  } else if (art) {
    const img = await loadImage(art);
    canvas.width = img.naturalWidth || COVER_W;
    canvas.height = img.naturalHeight || COVER_H;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    canvas.width = COVER_W;
    canvas.height = COVER_H;
    const spineColor = colors.spine;
    const ink = colors.ink;
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
export async function renderCoverBackPng(
  country: string | null | undefined,
  bgOverride?: string | null
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const { bg, ink } = coverColors(country, bgOverride);

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
