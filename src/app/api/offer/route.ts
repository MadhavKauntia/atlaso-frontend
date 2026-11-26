import { NextResponse } from "next/server";
import { currentOffer } from "@/lib/server/offer";

export const dynamic = "force-dynamic";

/** Whether an email-for-a-code offer is running. Never includes the code itself. */
export async function GET() {
  const offer = currentOffer();
  return NextResponse.json(
    offer ? { active: true, endsAt: offer.endsAt } : { active: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
