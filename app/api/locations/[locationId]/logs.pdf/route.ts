import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { loadLogExport, safeExportFilename } from "@/lib/log-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function pdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

export async function GET(request: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params;
    const result = await loadLogExport(locationId, request.url);
    if ("error" in result) return NextResponse.json({ message: result.error }, { status: result.status });
    const { location, business, range, logs, truncated } = result.data;

    const pdf = await PDFDocument.create();
    pdf.setTitle(`TempProof temperature log - ${location.name}`);
    pdf.setCreator("TempProof");
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const formatter = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: business.timezone,
    });
    let page: PDFPage;
    let y = 0;

    function addPage() {
      page = pdf.addPage([595.28, 841.89]);
      y = 796;
      page.drawText("TempProof temperature log", { x: 42, y, size: 18, font: bold, color: rgb(0.07, 0.22, 0.16) });
      y -= 28;
      page.drawText(pdfSafe(`${business.name} - ${location.name}`), { x: 42, y, size: 14, font: bold });
      y -= 20;
      page.drawText(`${range.label} | ${business.timezone} | Target ${Number(location.min_temp_c)} C to ${Number(location.max_temp_c)} C`, { x: 42, y, size: 9, font: regular, color: rgb(0.3, 0.34, 0.32) });
      y -= 25;
      page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.8, 0.84, 0.81) });
      y -= 18;
    }

    addPage();
    if (logs.length === 0) {
      page!.drawText("No readings in this date range.", { x: 42, y, size: 11, font: regular });
    }
    for (const log of logs) {
      const actionLines = log.corrective_action ? wrapText(pdfSafe(`Corrective action: ${log.corrective_action}`), regular, 9, 475) : [];
      const rowHeight = 24 + actionLines.length * 12;
      if (y - rowHeight < 45) addPage();
      const status = log.is_out_of_range ? "OUT OF RANGE" : "In range";
      page!.drawText(formatter.format(new Date(log.logged_at)), { x: 42, y, size: 9.5, font: regular });
      page!.drawText(`${Number(log.temperature_c)} C`, { x: 230, y, size: 10, font: bold });
      page!.drawText(status, { x: 315, y, size: 9.5, font: bold, color: log.is_out_of_range ? rgb(0.65, 0.08, 0.08) : rgb(0.03, 0.42, 0.22) });
      y -= 15;
      for (const line of actionLines) {
        page!.drawText(line, { x: 62, y, size: 9, font: regular, color: rgb(0.35, 0.2, 0.18) });
        y -= 12;
      }
      y -= 9;
      page!.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 0.5, color: rgb(0.88, 0.9, 0.89) });
      y -= 10;
    }
    if (truncated) page!.drawText("Export limited to the newest 50,000 readings.", { x: 42, y: Math.max(y, 35), size: 9, font: bold, color: rgb(0.65, 0.08, 0.08) });

    const bytes = await pdf.save();
    const filename = `TempProof-${safeExportFilename(location.name)}-${range.fromDate}-to-${range.toDate}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "The PDF export could not be created right now." }, { status: 503 });
  }
}
