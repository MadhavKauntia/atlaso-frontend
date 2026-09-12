import { getCountry, stampUrl, countryArtUrl } from "@/lib/covers/countries";

const COVER_W = 1414;
const COVER_H = 2000; // 0.707 portrait, matches the cover art
const SERIF = "Georgia, 'Times New Roman', serif";

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

    // atlaso wordmark, top-right
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 ${Math.round(COVER_H * 0.028)}px ${SERIF}`;
    ctx.fillText("atlaso", COVER_W * 0.92, COVER_H * 0.075);
    ctx.globalAlpha = 1;

    // stamp illustration — ~42% wide, vertically centred at 44%
    const img = await loadImage(stamp);
    const sw = COVER_W * 0.42;
    const sh = img.naturalHeight ? (sw / img.naturalWidth) * img.naturalHeight : sw / 0.8;
    ctx.drawImage(img, (COVER_W - sw) / 2, COVER_H * 0.44 - sh / 2, sw, sh);

    // title
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 ${Math.round(COVER_H * 0.095)}px ${SERIF}`;
    ctx.fillText(displayTitle, COVER_W / 2, COVER_H * 0.74, COVER_W * 0.82);

    // description
    if (displayDesc) {
      ctx.globalAlpha = 0.9;
      ctx.font = `italic 400 ${Math.round(COVER_H * 0.04)}px ${SERIF}`;
      ctx.fillText(displayDesc, COVER_W / 2, COVER_H * 0.82, COVER_W * 0.82);
      ctx.globalAlpha = 1;
    }
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
    ctx.font = `700 ${Math.round(COVER_H * 0.1)}px ${SERIF}`;
    ctx.fillText(displayTitle, COVER_W / 2, COVER_H * 0.7, COVER_W * 0.82);
    if (displayDesc) {
      ctx.globalAlpha = 0.9;
      ctx.font = `italic 400 ${Math.round(COVER_H * 0.042)}px ${SERIF}`;
      ctx.fillText(displayDesc, COVER_W / 2, COVER_H * 0.78, COVER_W * 0.82);
      ctx.globalAlpha = 1;
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
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
