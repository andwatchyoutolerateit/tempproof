import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(value: string) {
  const normalized = value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "temperature-unit";
}

function assertValidAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required before a QR code can be generated.");
  }
  if (process.env.VERCEL_ENV === "production" && appUrl.toLowerCase().includes("localhost")) {
    throw new Error("NEXT_PUBLIC_APP_URL must be the public production domain, not localhost.");
  }
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute http(s) URL.");
  }
  if (!/^https?:$/.test(parsed.protocol) || parsed.origin !== appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin with no path or trailing slash.");
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  assertValidAppUrl();
  const { locationId } = await params;
  if (!UUID.test(locationId)) return NextResponse.json({ message: "Location not found." }, { status: 404 });

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id,name,business_id")
      .eq("id", locationId)
      .single();
    if (locationError || !location) return NextResponse.json({ message: "Location not found." }, { status: 404 });

    const [qrResult, profileResult] = await Promise.all([
      supabase.from("qr_codes").select("token").eq("location_id", location.id).eq("is_active", true).single(),
      supabase.from("users").select("preferred_language").eq("id", authData.user.id).single(),
    ]);
    if (qrResult.error || !qrResult.data) return NextResponse.json({ message: "No active QR code exists for this location." }, { status: 409 });
    const qr = qrResult.data;
    const profile = profileResult.data;

    const token = qr.token;
    const logUrl = `${process.env.NEXT_PUBLIC_APP_URL}/log/${token}`;
    const qrDataUrl = await QRCode.toDataURL(logUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 1200,
      color: { dark: "#111111", light: "#FFFFFF" },
    });
    const qrBytes = Uint8Array.from(Buffer.from(qrDataUrl.split(",")[1], "base64"));

    const pdf = await PDFDocument.create();
    pdf.setTitle(`TempProof — ${location.name}`);
    pdf.setCreator("TempProof");
    const page = pdf.addPage([595.28, 841.89]);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const qrImage = await pdf.embedPng(qrBytes);
    const size = 380;
    const x = (page.getWidth() - size) / 2;
    const brandWidth = bold.widthOfTextAtSize("TempProof", 18);
    page.drawText("TempProof", { x: (page.getWidth() - brandWidth) / 2, y: 752, size: 18, font: bold, color: rgb(0.07, 0.22, 0.16) });
    page.drawImage(qrImage, { x, y: 320, width: size, height: size });

    const locationSize = location.name.length > 32 ? 25 : 31;
    const locationWidth = bold.widthOfTextAtSize(location.name, locationSize);
    page.drawText(location.name, {
      x: Math.max(40, (page.getWidth() - locationWidth) / 2),
      y: 258,
      size: locationSize,
      font: bold,
      color: rgb(0.09, 0.13, 0.11),
      maxWidth: page.getWidth() - 80,
    });
    const instruction = profile?.preferred_language === "de"
      ? "Scannen zur Temperaturerfassung"
      : "Scan to log temperature";
    const instructionWidth = regular.widthOfTextAtSize(instruction, 19);
    page.drawText(instruction, {
      x: (page.getWidth() - instructionWidth) / 2,
      y: 215,
      size: 19,
      font: regular,
      color: rgb(0.25, 0.3, 0.27),
    });

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="TempProof-${safeFilename(location.name)}-QR.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "The QR PDF could not be created right now. Please try again." }, { status: 503 });
  }
}
