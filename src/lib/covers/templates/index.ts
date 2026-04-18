import { archwayTemplate } from "./archway";
import { risingSunTemplate } from "./rising-sun";
import { ridgelineTemplate } from "./ridgeline";
import type { CoverTemplate } from "../types";

export { ArchIllustration } from "./archway";
export { SunIllustration } from "./rising-sun";
export { RidgeIllustration } from "./ridgeline";

export const TEMPLATES: Record<string, CoverTemplate> = {
  [archwayTemplate.id]:   archwayTemplate,
  [risingSunTemplate.id]: risingSunTemplate,
  [ridgelineTemplate.id]: ridgelineTemplate,
};
