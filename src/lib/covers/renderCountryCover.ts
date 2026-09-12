import { getCountry, countryArtUrl } from "@/lib/covers/countries";

/**
 * Renders the chosen country cover to a print-ready PNG and returns the raw
 * base64 (no data-URL prefix), suitable for POSTing to the backend export
 * endpoint. Countries with bundled art render the illustration; the rest get a
 * solid spine-coloured cover with the title.
 */
export async function renderCountryCoverPng(
  country: string | null | undefined,
  title: string
): Promise<string | undefined> {
  if (typeof document === "undefined") return undefined;
  const def = getCountry(country);
  const art = countryArtUrl(def);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  if (art) {
    const img = await loadImage(art);
    canvas.width = img.naturalWidth || 1200;
    canvas.height = img.naturalHeight || 1600;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    canvas.width = 1200;
    canvas.height = 1600;
    const spineColor = def?.spine ?? "#302b28";
    const ink = def?.ink ?? "#f3ead8";
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, spineColor);
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const text = (def?.name || title || "your trip").toUpperCase();
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 120px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(text, canvas.width / 2, canvas.height - 200, canvas.width - 160);
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
