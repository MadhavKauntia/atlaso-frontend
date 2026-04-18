import { NextRequest, NextResponse } from "next/server";
import { exportCoverSVG, type ExportCoverConfig } from "@/lib/covers/export";
import path from "path";

export async function POST(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "png";

  let config: ExportCoverConfig;
  try {
    config = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!config.templateId || !config.paletteId) {
    return NextResponse.json({ error: "templateId and paletteId are required" }, { status: 400 });
  }

  let svg: string;
  try {
    svg = exportCoverSVG(config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (format === "svg") {
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="atlaso-cover.svg"`,
      },
    });
  }

  // PNG via resvg-js
  try {
    const { Resvg } = await import("@resvg/resvg-js");

    const fontPath = path.join(process.cwd(), "public", "fraunces.ttf");

    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
        fontFiles: [fontPath],
      },
    });
    const pngData = resvg.render();
    const buffer = Buffer.from(pngData.asPng());

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="atlaso-cover.png"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `PNG render failed: ${(err as Error).message}` }, { status: 500 });
  }
}
