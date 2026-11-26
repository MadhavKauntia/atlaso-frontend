import { endsLabel, type Offer } from "./offer";

/**
 * The email that carries an offer's code. Table layout with inline styles so it holds up
 * in Gmail, Outlook and Apple Mail; images are hosted on the site (absolute URLs).
 */
export function offerEmail(offer: Offer, siteUrl: string) {
  const ends = endsLabel(offer.endsAt);
  const what = offer.description ?? "your Atlaso offer";
  // "50% off your travel photo book" → a big "50% off" over "your travel photo book".
  const m = what.match(/^(\S+\s+off)\s+(.+)$/i);
  const big = m ? m[1] : what;
  const rest = m ? m[2] : "";
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const img = (path: string) => `${siteUrl}${path}`;

  const subject = offer.tag ? `${offer.tag}: your Atlaso code is inside` : "Your Atlaso code is inside";
  const preheader = `${what}. Your code: ${offer.code}${ends ? `, valid until ${ends} IST` : ""}.`;

  const text = [
    offer.tag ? offer.tag.toUpperCase() : "",
    `${what}`,
    "",
    `Your code: ${offer.code}`,
    `Enter it at checkout${ends ? ` before ${ends} (IST)` : ""}. One code per order.`,
    "",
    `Start your photo book: ${siteUrl}/create`,
    "",
    "Atlaso · Hardcover travel photo books, printed and delivered across India.",
    "You're getting this because you asked for this code on myatlaso.com.",
  ].filter((l, i) => l || i > 0).join("\n");

  const font = "'DM Sans',Helvetica,Arial,sans-serif";
  const stamp = (name: string) =>
    `<td style="padding:0 6px;"><img src="${img(`/assets/stamps/${name}.png`)}" width="58" alt="" style="display:block;width:58px;height:auto;border:0;"></td>`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f3ead8;" bgcolor="#f3ead8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3ead8;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3ead8" style="background:#f3ead8;">
<tr><td align="center" style="padding:36px 14px 40px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
  <!-- logo -->
  <tr><td align="center" style="padding:0 0 24px;">
    <a href="${esc(siteUrl)}" style="text-decoration:none;"><img src="${img("/assets/logo-black.png")}" width="132" alt="atlaso" style="display:block;width:132px;height:auto;border:0;"></a>
  </td></tr>

  <!-- card -->
  <tr><td bgcolor="#1f1b18" style="background:#1f1b18;border-radius:24px;padding:40px 36px 36px;font-family:${font};color:#f3ecdd;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${stamp("japan")}${stamp("bali")}${stamp("paris")}</tr></table>
      </td></tr>
      ${offer.tag ? `<tr><td align="center" style="padding:26px 0 0;">
        <span style="display:inline-block;background:#bd4636;color:#ffffff;font-family:${font};font-weight:700;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:7px 14px;border-radius:999px;">${esc(offer.tag)}</span>
      </td></tr>` : ""}
      <tr><td align="center" style="padding:18px 0 0;font-family:${font};font-weight:700;font-size:52px;line-height:1;letter-spacing:-1.5px;color:#e5b94b;">${esc(big)}</td></tr>
      ${rest ? `<tr><td align="center" style="padding:10px 0 0;font-family:${font};font-weight:600;font-size:20px;line-height:1.3;color:#f3ecdd;">${esc(rest)}</td></tr>` : ""}
      <tr><td align="center" style="padding:14px 8px 0;font-family:${font};font-size:15px;line-height:1.55;color:#b8ae9f;">
        Here&rsquo;s the code you asked for. Turn your trip photos into a 50-page hardcover photo book, designed for you in minutes.
      </td></tr>

      <!-- the coupon -->
      <tr><td style="padding:28px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3ead8" style="background:#f3ead8;border:2px dashed #c9a24a;border-radius:16px;">
          <tr><td align="center" style="padding:20px 16px 22px;font-family:${font};">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a7f70;">your code</div>
            <div style="margin-top:8px;font-family:${font};font-weight:700;font-size:30px;letter-spacing:4px;color:#1f1b18;">${esc(offer.code)}</div>
            ${ends ? `<div style="margin-top:8px;font-size:13px;color:#6b6157;">valid until ${esc(ends)} IST</div>` : ""}
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding:28px 0 0;">
        <a href="${esc(siteUrl)}/create" style="display:inline-block;background:#e5b94b;color:#1f1b18;font-family:${font};font-weight:700;font-size:17px;text-decoration:none;padding:16px 34px;border-radius:999px;">start my photo book &rarr;</a>
      </td></tr>
      <tr><td align="center" style="padding:14px 0 0;font-family:${font};font-size:13px;line-height:1.5;color:#8f8678;">
        Enter the code at checkout. One code per order.
      </td></tr>
    </table>
  </td></tr>

  <!-- footer -->
  <tr><td align="center" style="padding:24px 20px 0;font-family:${font};font-size:12px;line-height:1.6;color:#7d7568;">
    Atlaso &middot; Hardcover travel photo books, printed and delivered across India.<br>
    You&rsquo;re getting this because you asked for this code on <a href="${esc(siteUrl)}" style="color:#7d7568;">myatlaso.com</a>.
  </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}
