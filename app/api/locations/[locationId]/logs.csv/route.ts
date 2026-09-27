import { NextResponse } from "next/server";
import { loadLogExport, safeExportFilename } from "@/lib/log-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params;
    const result = await loadLogExport(locationId, request.url);
    if ("error" in result) return NextResponse.json({ message: result.error }, { status: result.status });

    const { location, business, range, logs, truncated } = result.data;
    const formatter = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone: business.timezone,
    });
    const rows = [
      ["Timestamp", "Timezone", "Temperature (C)", "Status", "Corrective action"],
      ...logs.map((log) => [
        formatter.format(new Date(log.logged_at)),
        business.timezone,
        Number(log.temperature_c),
        log.is_out_of_range ? "Out of range" : "In range",
        log.corrective_action ?? "",
      ]),
    ];
    if (truncated) rows.push(["Export limited to 50000 rows", "", "", "", ""]);
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const filename = `TempProof-${safeExportFilename(location.name)}-${range.fromDate}-to-${range.toDate}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "The CSV export could not be created right now." }, { status: 503 });
  }
}
