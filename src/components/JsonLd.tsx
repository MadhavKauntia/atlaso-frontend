import { jsonLd } from "@/lib/site";

/** Renders schema.org structured data. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
