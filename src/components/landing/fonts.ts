import { DM_Sans, Homemade_Apple } from "next/font/google";

/** Variable DM Sans with the optical-size axis: large headings get the tighter
 *  display cut and weight 600, as in the landing design. Scoped to the landing
 *  sections so the rest of the site keeps its static DM Sans. */
export const dmDisplay = DM_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-dm-display",
  display: "swap",
});

export const hand = Homemade_Apple({ weight: "400", subsets: ["latin"], display: "swap" });
