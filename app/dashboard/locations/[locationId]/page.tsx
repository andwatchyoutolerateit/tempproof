import { QrActions } from "@/components/qr-actions";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { logRangeQuery, resolveLogRange, safeTimeZone } from "@/lib/log-range";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 50;

type Location = {
  id: string;
  business_id: string;
  name: string;
  min_temp_c: number | string;
  max_temp_c: number | string;
  check_interval_minutes: number;
};

type LogRow = {
  id: string;
  temperature_c: number | string;
  is_out_of_range: boolean;
  corrective_action: string | null;
  logged_at: string;
};

function elapsedLabel(milliseconds: number) {
  const minutes = Math.max(1, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder ? `${hours}h ${remainder}m` : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function appOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required before a QR code can be generated.");
  if (process.env.VERCEL_ENV === "production" && appUrl.toLowerCase().includes("localhost")) {
    throw new Error("NEXT_PUBLIC_APP_URL must be the public production domain, not localhost.");
  }
  const parsed = new URL(appUrl);
  if (!/^https?:$/.test(parsed.protocol) || parsed.origin !== appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin with no path or trailing slash.");
  }
  return appUrl;
}

export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string; page?: string }>;
}) {
  const { locationId } = await params;
  const queryValues = await searchParams;
  const requestedPage = Number(queryValues.page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 200) : 1;
  let location: Location | null = null;
  let business: { name: string; timezone: string } | null = null;
  let logs: LogRow[] = [];
  let totalLogs = 0;
  let latest: Pick<LogRow, "logged_at" | "is_out_of_range"> | null = null;
  let qrDataUrl = "";
  let instruction = "Scan to log temperature";
  let qrLoadFailed = false;
  let loadFailed = false;

  try {
    if (!UUID.test(locationId)) throw new Error("Invalid location ID");
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated");

    const locationResult = await supabase
      .from("locations")
      .select("id,business_id,name,min_temp_c,max_temp_c,check_interval_minutes")
      .eq("id", locationId)
      .eq("is_active", true)
      .maybeSingle();
    if (locationResult.error) throw locationResult.error;
    location = locationResult.data as Location | null;

    if (location) {
      const businessResult = await supabase
        .from("businesses")
        .select("name,timezone")
        .eq("id", location.business_id)
        .single();
      if (businessResult.error) throw businessResult.error;
      business = { ...businessResult.data, timezone: safeTimeZone(businessResult.data.timezone) };
      const selectedRange = resolveLogRange(queryValues, business.timezone);

      const [logsResult, latestResult, qrResult, profileResult] = await Promise.all([
        supabase
          .from("temperature_logs")
          .select("id,temperature_c,is_out_of_range,corrective_action,logged_at", { count: "exact" })
          .eq("location_id", location.id)
          .gte("logged_at", selectedRange.from.toISOString())
          .lt("logged_at", selectedRange.toExclusive.toISOString())
          .order("logged_at", { ascending: false })
          .range(0, page * PAGE_SIZE - 1),
        supabase
          .from("temperature_logs")
          .select("logged_at,is_out_of_range")
          .eq("location_id", location.id)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("qr_codes").select("token").eq("location_id", location.id).eq("is_active", true).maybeSingle(),
        supabase.from("users").select("preferred_language").eq("id", authData.user.id).single(),
      ]);

      if (logsResult.error || latestResult.error) throw logsResult.error ?? latestResult.error;
      logs = (logsResult.data ?? []) as LogRow[];
      totalLogs = logsResult.count ?? logs.length;
      latest = latestResult.data as Pick<LogRow, "logged_at" | "is_out_of_range"> | null;

      if (qrResult.error || !qrResult.data) {
        qrLoadFailed = true;
      } else {
        qrDataUrl = await QRCode.toDataURL(`${appOrigin()}/log/${qrResult.data.token}`, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 900,
          color: { dark: "#111111", light: "#FFFFFF" },
        });
      }
      instruction = profileResult.data?.preferred_language === "de"
        ? "Scannen zur Temperaturerfassung"
        : "Scan to log temperature";
    }
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Location unavailable</h1><p>We could not load this location right now. Please try again.</p><Link href="/dashboard">Back to dashboard</Link></div></main>;
  }
  if (!location || !business) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Location not found</h1><Link href="/dashboard">Back to dashboard</Link></div></main>;
  }

  const selectedRange = resolveLogRange(queryValues, business.timezone);
  const rangeQuery = logRangeQuery(selectedRange);
  const exportQuery = rangeQuery.toString();
  const hasMore = logs.length < totalLogs;
  const loadMoreQuery = new URLSearchParams(rangeQuery);
  loadMoreQuery.set("page", String(page + 1));
  const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: business.timezone,
  });
  const latestAge = latest ? Date.now() - new Date(latest.logged_at).getTime() : Number.POSITIVE_INFINITY;
  const missed = !latest || latestAge > location.check_interval_minutes * 60_000;

  return (
    <main className="dashboard-shell location-detail-shell">
      <div className="dashboard-card">
        <div className="no-print">
          <div className="brand">TempProof</div>
          <p><Link href="/dashboard">← Back to dashboard</Link></p>
          <div className={`location-health ${missed ? "health-warning" : latest?.is_out_of_range ? "health-danger" : "health-good"}`}>
            <strong>{missed ? (latest ? `Missed check — no reading in ${elapsedLabel(latestAge)}` : "No checks recorded yet") : latest?.is_out_of_range ? "Latest reading is out of range" : "Checks are up to date"}</strong>
            {latest && <span>Last checked {timestampFormatter.format(new Date(latest.logged_at))} ({business.timezone})</span>}
          </div>
        </div>

        {qrLoadFailed ? (
          <div className="error-box no-print" role="alert">The QR preview is temporarily unavailable. The log history below is still available.</div>
        ) : (
          <section className="qr-print-sheet">
            <Image className="qr-preview-image" src={qrDataUrl} alt={`QR code for ${location.name}`} width={900} height={900} priority unoptimized />
            <h1 className="qr-location-name">{location.name}</h1>
            <p className="qr-instruction">{instruction}</p>
          </section>
        )}
        <p className="range no-print">Acceptable range: <strong>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</strong></p>
        <QrActions locationId={location.id} locationName={location.name} />
      </div>

      <section className="dashboard-card log-history-card no-print">
        <div className="log-history-heading">
          <div><h2>Temperature history</h2><p>{selectedRange.label} · {business.timezone}</p></div>
          <div className="export-actions">
            <a className="secondary-button compact-button" href={`/api/locations/${location.id}/logs.csv?${exportQuery}`}>Export CSV</a>
            <a className="secondary-button compact-button" href={`/api/locations/${location.id}/logs.pdf?${exportQuery}`}>Export PDF</a>
          </div>
        </div>

        <div className="range-filter" aria-label="Log date range">
          <Link className={`filter-chip${selectedRange.key === "7" ? " active" : ""}`} href="?range=7">Last 7 days</Link>
          <Link className={`filter-chip${selectedRange.key === "30" ? " active" : ""}`} href="?range=30">Last 30 days</Link>
          <form className="custom-range-form" method="get">
            <input type="hidden" name="range" value="custom" />
            <label>From<input type="date" name="from" defaultValue={selectedRange.fromDate} required /></label>
            <label>To<input type="date" name="to" defaultValue={selectedRange.toDate} required /></label>
            <button className="secondary-button compact-button" type="submit">Apply</button>
          </form>
        </div>

        {logs.length === 0 ? (
          <p className="empty-state">No readings in this date range.</p>
        ) : (
          <div className="log-table-wrap">
            <table className="log-table">
              <thead><tr><th>Timestamp</th><th>Temperature</th><th>Status / corrective action</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className={log.is_out_of_range ? "out-of-range-row" : ""}>
                    <td><time dateTime={log.logged_at}>{timestampFormatter.format(new Date(log.logged_at))}</time></td>
                    <td className="temperature-cell">{Number(log.temperature_c)}°C</td>
                    <td>
                      <span className={log.is_out_of_range ? "status-danger" : "status-good"}>{log.is_out_of_range ? "⚠ Out of range" : "In range"}</span>
                      {log.corrective_action && (
                        <details className="corrective-details">
                          <summary>View corrective action</summary>
                          <p>{log.corrective_action}</p>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="history-footer">
          <span>Showing {logs.length} of {totalLogs} readings</span>
          {hasMore && <Link className="secondary-button compact-button" href={`?${loadMoreQuery.toString()}`}>Load 50 more</Link>}
        </div>
      </section>
    </main>
  );
}
