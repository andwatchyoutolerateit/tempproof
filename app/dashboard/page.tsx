import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { QrActions } from "@/components/qr-actions";
import { AddLocationPanel } from "@/components/add-location-panel";
import { safeTimeZone } from "@/lib/log-range";

export const dynamic = "force-dynamic";

type Location = {
  id: string;
  name: string;
  min_temp_c: number | string;
  max_temp_c: number | string;
  check_interval_minutes: number;
};

type LatestLog = { location_id: string; logged_at: string; is_out_of_range: boolean };
type Business = { id: string; name: string; timezone: string };
type DashboardData = {
  business: Business | null;
  locations: Location[];
  latestByLocation: Map<string, LatestLog>;
  destination?: "/login" | "/onboarding";
  loadError?: string;
};

function elapsedLabel(milliseconds: number) {
  const minutes = Math.max(1, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function locationState(location: Location, latest: LatestLog | undefined, now: number) {
  if (!latest) return { priority: 0, kind: "missed" as const, label: "No checks yet", age: Number.POSITIVE_INFINITY };
  const age = Math.max(0, now - new Date(latest.logged_at).getTime());
  if (age > location.check_interval_minutes * 60_000) {
    return { priority: 0, kind: "missed" as const, label: `No check in ${elapsedLabel(age)}`, age };
  }
  if (latest.is_out_of_range) return { priority: 1, kind: "danger" as const, label: "Out of range", age };
  return { priority: 2, kind: "good" as const, label: "In range", age };
}

async function loadDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { business: null, locations: [], latestByLocation: new Map(), destination: "/login" };

    const { data: businessRow, error: businessError } = await supabase
      .from("businesses")
      .select("id,name,timezone")
      .eq("owner_user_id", authData.user.id)
      .limit(1)
      .maybeSingle();
    if (businessError) return { business: null, locations: [], latestByLocation: new Map(), loadError: "We could not load your business right now." };
    if (!businessRow) return { business: null, locations: [], latestByLocation: new Map(), destination: "/onboarding" };
    const business: Business = { ...businessRow, timezone: safeTimeZone(businessRow.timezone) };

    const { data: locationRows, error: locationsError } = await supabase
      .from("locations")
      .select("id,name,min_temp_c,max_temp_c,check_interval_minutes")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name");
    if (locationsError) return { business, locations: [], latestByLocation: new Map(), loadError: "We could not load your locations right now." };

    const locations = (locationRows ?? []) as Location[];
    const latestByLocation = new Map<string, LatestLog>();
    const latestResults = await Promise.all(locations.map((location) => supabase
      .from("temperature_logs")
      .select("location_id,logged_at,is_out_of_range")
      .eq("location_id", location.id)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle()));

    let latestLoadFailed = false;
    for (const result of latestResults) {
      if (result.error) latestLoadFailed = true;
      else if (result.data) latestByLocation.set(result.data.location_id, result.data as LatestLog);
    }
    return {
      business,
      locations,
      latestByLocation,
      loadError: latestLoadFailed ? "Locations loaded, but some latest readings are temporarily unavailable." : undefined,
    };
  } catch {
    return { business: null, locations: [], latestByLocation: new Map(), loadError: "TempProof is temporarily unavailable. Please refresh and try again." };
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const { business, locations, latestByLocation, destination, loadError } = await loadDashboardData();
  if (destination) redirect(destination);
  const { error, added } = await searchParams;
  const actionErrors: Record<string, string> = {
    "invalid-location": "Check the location name, temperature range, interval, and cutoff time.",
    "create-location-failed": "The location could not be created. Check your details and try again.",
    "service-unavailable": "TempProof could not save the location right now. Please try again.",
  };
  const errorMessage = error ? actionErrors[error] ?? "The request could not be completed. Please try again." : "";
  if (!business) return <main className="dashboard-shell"><div className="dashboard-card"><h1>Dashboard unavailable</h1><p>Please refresh and try again.</p></div></main>;

  const now = Date.now();
  const sortedLocations = [...locations].sort((left, right) => {
    const leftState = locationState(left, latestByLocation.get(left.id), now);
    const rightState = locationState(right, latestByLocation.get(right.id), now);
    return leftState.priority - rightState.priority || rightState.age - leftState.age || left.name.localeCompare(right.name);
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: business.timezone });

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><div className="brand">TempProof</div><h1>{business.name}</h1></div>
        <LogoutButton />
      </header>

      <section className="dashboard-card">
        <h2>Locations</h2>
        {loadError && <div className="error-box" role="alert">{loadError}</div>}
        {added && <div className="success-box" role="status">Location added. Open it below to view and print its QR code.</div>}
        {locations.length === 0 && <p className="empty-state">No locations yet. Add your first one below.</p>}
        <div className="location-list">
          {sortedLocations.map((location) => {
            const latest = latestByLocation.get(location.id);
            const state = locationState(location, latest, now);
            return (
              <article className={`location-row location-state-${state.kind}${added === location.id ? " newly-added" : ""}`} key={location.id}>
                <div className="location-row-main">
                  <Link className="location-main-link" href={`/dashboard/locations/${location.id}`} aria-label={`Open ${location.name} log history`}>
                    <strong>{location.name}</strong>
                    <span>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</span>
                  </Link>
                  <div className="location-status">
                    <span className={state.kind === "good" ? "status-good" : state.kind === "danger" ? "status-danger" : "status-warning"}>{state.label}</span>
                    {latest && <time dateTime={latest.logged_at}>{timeFormatter.format(new Date(latest.logged_at))}</time>}
                  </div>
                </div>
                <QrActions locationId={location.id} locationName={location.name} variant="list" />
              </article>
            );
          })}
        </div>
      </section>

      <AddLocationPanel defaultExpanded={locations.length === 0} errorMessage={errorMessage} />
    </main>
  );
}
