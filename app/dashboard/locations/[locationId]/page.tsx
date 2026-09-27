import { QrActions } from "@/components/qr-actions";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  let location: { id: string; name: string; min_temp_c: number | string; max_temp_c: number | string } | null = null;
  let qrDataUrl = "";
  let instruction = "Scan to log temperature";
  let loadFailed = false;

  if (UUID.test(locationId)) {
    try {
      const supabase = await createAuthenticatedSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData.user) {
        const { data, error } = await supabase
          .from("locations")
          .select("id,name,min_temp_c,max_temp_c")
          .eq("id", locationId)
          .single();
        if (error && error.code !== "PGRST116") loadFailed = true;
        location = data;

        if (location) {
          const [qrResult, profileResult] = await Promise.all([
            supabase
              .from("qr_codes")
              .select("token")
              .eq("location_id", location.id)
              .eq("is_active", true)
              .single(),
            supabase
              .from("users")
              .select("preferred_language")
              .eq("id", authData.user.id)
              .single(),
          ]);
          if (qrResult.error || !qrResult.data) {
            loadFailed = true;
          } else {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
            if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required before a QR code can be generated.");
            if (process.env.VERCEL_ENV === "production" && appUrl.toLowerCase().includes("localhost")) {
              throw new Error("NEXT_PUBLIC_APP_URL must be the public production domain, not localhost.");
            }
            const parsedAppUrl = new URL(appUrl);
            if (!/^https?:$/.test(parsedAppUrl.protocol) || parsedAppUrl.origin !== appUrl) {
              throw new Error("NEXT_PUBLIC_APP_URL must be an origin with no path or trailing slash.");
            }
            const token = qrResult.data.token;
            const logUrl = `${process.env.NEXT_PUBLIC_APP_URL}/log/${token}`;
            qrDataUrl = await QRCode.toDataURL(logUrl, {
              errorCorrectionLevel: "H",
              margin: 2,
              width: 900,
              color: { dark: "#111111", light: "#FFFFFF" },
            });
            instruction = profileResult.data?.preferred_language === "de"
              ? "Scannen zur Temperaturerfassung"
              : "Scan to log temperature";
          }
        }
      }
    } catch {
      loadFailed = true;
    }
  }

  if (loadFailed) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Location unavailable</h1><p>We could not load this location right now. Please try again.</p><Link href="/dashboard">Back to dashboard</Link></div></main>;
  }
  if (!location) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Location not found</h1><Link href="/dashboard">Back to dashboard</Link></div></main>;
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-card">
        <div className="no-print">
          <div className="brand">TempProof</div>
          <p><Link href="/dashboard">← Back to dashboard</Link></p>
        </div>
        <section className="qr-print-sheet">
          <Image
            className="qr-preview-image"
            src={qrDataUrl}
            alt={`QR code for ${location.name}`}
            width={900}
            height={900}
            priority
            unoptimized
          />
          <h1 className="qr-location-name">{location.name}</h1>
          <p className="qr-instruction">{instruction}</p>
        </section>
        <p className="range no-print">Acceptable range: <strong>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</strong></p>
        <QrActions locationId={location.id} locationName={location.name} />
      </div>
    </main>
  );
}
