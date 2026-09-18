# Implementation Plan: Manual / Privacy Mode ("Design it yourself")

A privacy-conscious alternative to the default AI flow. Instead of sending photos to
OpenAI for curation and layout, the user gets a book pre-filled in chronological order
that they arrange themselves using the existing Replace / Layout / Swap / Reframe tools.

## Decisions locked in

- **Fill strategy:** chronological auto-fill (EXIF date order) into default layouts, no AI.
  A usable starting book, not empty rectangles.
- **Entry point:** secondary CTA on the cover page (next to "build my photobook"), _not_ a
  pre-upload screen. Default AI path stays frictionless. (Privacy as an acquisition message
  belongs on the landing page, not as a blocking in-funnel gate.)
- **No landing-page copy changes.**
- **Privacy policy updated** to reflect that manual mode never sends photos to OpenAI.

---

## 1. Backend dependency (not in this repo — flagged)

A new endpoint is required. Everything else depends on it:

```
POST /trips/{tripId}/book/create-manual
body: { country?: string, subtitle?: string }
→ returns a Book already in status READY_FOR_PREVIEW
```

Behavior: build `pages[]` by dropping photos in EXIF-`DateTimeOriginal` order (fallback:
upload order) into default layouts chosen by photos-per-page. **No vision calls, no
curation, no captions.** Persist `coverCountry`/`subtitle` at creation (same reasoning as
`generateBook` — survives cold load from the email link). Fill _all_ slots it creates
(don't create more slots than photos).

Two product decisions for the backend owner:

- **Free-preview quota (402):** recommend manual books do **not** consume the AI
  free-preview quota (no OpenAI cost). Confirm.
- **Page count rule:** e.g. ~2 photos/page, capped at the 50-page book size shown on the
  cover preview.

The frontend can be stubbed behind `IS_MOCK` so the whole flow is testable before the
endpoint lands.

## 2. `src/lib/api.ts` — add the client call

Alongside `generateBook` (~line 446), add:

```ts
export async function createManualBook(
  tripId: string,
  cover?: { country?: string; subtitle?: string }
): Promise<Book> {
  if (IS_MOCK) return { ...mockBook(tripId), coverCountry: cover?.country ?? null };
  const res = await apiFetch(
    `${BASE}/trips/${tripId}/book/create-manual`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: cover?.country, subtitle: cover?.subtitle }) },
    GENERATE_REQUEST_TIMEOUT_MS
  );
  if (!res.ok) await throwApiError(res);
  return res.json();
}
```

## 3. `src/app/trips/[tripId]/cover/page.tsx` — secondary CTA

- Add a `pendingMode` ref (`"ai" | "manual"`) so the login modal resumes the right path
  after sign-in.
- Refactor: `handleGenerate` sets `pendingMode.current = "ai"`; add `handleDesignYourself`
  setting `"manual"`. Both call `persistPrefs()`, gate on `getToken()` (show login modal if
  absent), `claimTrip(tripId)`, then route:
  - AI → `/trips/${tripId}/generating`
  - Manual → `/trips/${tripId}/generating?mode=manual`
- `handleLoginSuccess` reads `pendingMode.current` to pick the route (currently hardcoded to
  the generating/AI path).
- **UI:** under the primary red "build my photobook →" button (in `FlowBottomBar`, ~line
  485), add a secondary, lower-emphasis link/button:
  > _Prefer to arrange it yourself? Your photos stay private — never sent to our AI →_

  Only shown when `!bookId` (new-book flow), matching the existing `handleGenerate` gating.

## 4. `src/app/trips/[tripId]/generating/page.tsx` — manual branch

Reuse this page (keeps the existing auth gate, error/resume, and quota handling) with a
`mode=manual` branch:

- Read `const manual = searchParams.get("mode") === "manual";`
- In the `run()` effect (~line 165): if `manual`, call `createManualBook(tripId, {...})`
  instead of `generateBook`, then the same `pollBookUntilReady` (resolves fast since the
  backend returns `READY_FOR_PREVIEW`).
- Swap AI-specific copy when `manual`:
  - Eyebrow "Crafting your book" → "Setting up your book"
  - Body (line 402): drop "Our AI is reading every photo…" → "Putting your photos in order
    so you can arrange them yourself."
  - Replace the 5-step AI `STEPS` list with a single lightweight spinner/step ("Preparing
    your pages"), and skip the count-based estimate (`estimateSentence`).
  - Tips section is generic — can stay.

## 5. `src/app/trips/[tripId]/preview/page.tsx` — defensive empty-slot rendering

Currently `SlotRenderer` (~line 997) always renders
`<img src={photoUrls[slot.photoId] ?? getPhotoImageUrl(tripId, slot.photoId)}>` — a falsy
`photoId` renders a broken image. Chronological fill means slots _should_ be full, but a
user growing a layout could out-run available photos. Add a guard: when `!slot.photoId`,
render an "empty slot" placeholder (dashed frame, "+ Add photo") whose click opens the
existing `PhotoPickerModal` (reuse `onReplace`). Low-risk, benefits both modes.

Verify the preview intro copy ("Your photobook is ready" + edit instructions, ~line 327)
reads fine for a manually-built book — it's mode-agnostic, likely no change needed.

## 6. `src/app/privacy/page.tsx` — policy update

Make OpenAI processing conditional on AI mode. Bump the "updated" date (line 11), then:

- **Line 29** → "…including, **when you choose our automatic AI layout**, automated
  analysis of your uploaded photos by an AI vision model (OpenAI)…"
- **Line 39** → "**OpenAI**: to analyse uploaded photos for curation and layout **when you
  choose the automatic AI layout. If you choose to design your book yourself, your photos
  are never sent to OpenAI.**"
- **Line 78** (international processing) → note OpenAI processing applies only to
  AI-arranged books.

---

## Testing

- `IS_MOCK` run of the whole manual path: cover → "design it yourself" → login modal resumes
  to `?mode=manual` → generating (manual copy) → preview with a filled book.
- Replace / Layout / Swap / Reframe all work on the manually-built book (they already do —
  same `Book` shape).
- Empty-slot placeholder appears + opens picker when a layout grows past available photos.
- AI path unchanged (regression check on primary CTA + login resume).

## Out of scope / flagged

- Backend `create-manual` endpoint (dependency above).
- Free-preview quota treatment for manual books (decision needed).
- Upload's 50-photo minimum still applies (choice happens post-upload) — no change unless we
  want to relax it for manual users.

---

## Suggested build order

1. `IS_MOCK`-stubbed `createManualBook` + cover CTA + generating branch — click through the
   whole flow locally before the backend endpoint exists.
2. Empty-slot placeholder in the preview.
3. Privacy policy copy.
4. Wire to the real backend endpoint once available.
