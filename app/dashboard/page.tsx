import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { SubmitButton } from "@/components/submit-button";
import { createLocation } from "./actions";

export const dynamic = "force-dynamic";

type Location = {
  id: string;
  name: string;
  min_temp_c: number | string;
  max_temp_c: number | string;
};

type LatestLog = {
  location_id: string;
  logged_at: string;
  is_out_of_range: boolean;
};

type DashboardData = {
  business: { id: string; name: string } | null;
  locations: Location[];
  latestByLocation: Map<string, LatestLog>;
  destination?: "/login" | "/onboarding";
  loadError?: string;
};

async function loadDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { business: null, locations: [], latestByLocation: new Map(), destination: "/login" };
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id,name")
      .eq("owner_user_id", authData.user.id)
      .limit(1)
      .maybeSingle();
    if (businessError) {
      return { business: null, locations: [], latestByLocation: new Map(), loadError: "We could not load your business right now." };
    }
    if (!business) {
      return { business: null, locations: [], latestByLocation: new Map(), destination: "/onboarding" };
    }

    const { data: locationRows, error: locationsError } = await supabase
      .from("locations")
      .select("id,name,min_temp_c,max_temp_c")
      .eq("business_id", business.id)
      .order("name");
    if (locationsError) {
      return { business, locations: [], latestByLocation: new Map(), loadError: "We could not load your locations right now." };
    }

    const locations = (locationRows ?? []) as Location[];
    const latestByLocation = new Map<string, LatestLog>();
    if (locations.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from("temperature_logs")
        .select("location_id,logged_at,is_out_of_range")
        .in("location_id", locations.map((location) => location.id))
        .order("logged_at", { ascending: false });
      if (logsError) {
        return { business, locations, latestByLocation, loadError: "Locations loaded, but their latest readings are temporarily unavailable." };
      }
      for (const log of (logs ?? []) as LatestLog[]) {
        if (!latestByLocation.has(log.location_id)) latestByLocation.set(log.location_id, log);
      }
    }

    return { business, locations, latestByLocation };
  } catch {
    return { business: null, locations: [], latestByLocation: new Map(), loadError: "TempProof is temporarily unavailable. Please refresh and try again." };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { business, locations, latestByLocation, destination, loadError } = await loadDashboardData();
  if (destination) redirect(destination);

  const { error } = await searchParams;
  const actionErrors: Record<string, string> = {
    "invalid-location": "Check the location name, temperature range, interval, and cutoff time.",
    "create-location-failed": "The location could not be created. Check your details and try again.",
    "service-unavailable": "TempProof could not save the location right now. Please try again.",
  };
  const errorMessage = error ? actionErrors[error] ?? "The request could not be completed. Please try again." : "";

  if (!business) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Dashboard unavailable</h1><p>Please refresh and try again.</p></div></main>;
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><div className="brand">TempProof</div><h1>{business.name}</h1></div>
        <LogoutButton />
      </header>

      <section className="dashboard-card">
        <h2>Locations</h2>
        {loadError && <div className="error-box" role="alert">{loadError}</div>}
        {!loadError && locations.length === 0 && <p className="empty-state">No locations yet. Add your first one below.</p>}
        <div className="location-list">
          {locations.map((location) => {
            const latest = latestByLocation.get(location.id);
            return (
              <Link className="location-row" href={`/dashboard/locations/${location.id}`} key={location.id}>
                <div>
                  <strong>{location.name}</strong>
                  <span>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</span>
                </div>
                <div className="location-status">
                  {!latest ? <span className="status-neutral">No readings yet</span> : (
                    <>
                      <span className={latest.is_out_of_range ? "status-danger" : "status-good"}>
                        {latest.is_out_of_range ? "Out of range" : "In range"}
                      </span>
                      <time dateTime={latest.logged_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latest.logged_at))}</time>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-card add-location-card">
        <h2>Add location</h2>
        <form className="manager-form location-form" action={createLocation}>
          <div className="full-field"><label htmlFor="location-name">Name</label><input id="location-name" name="name" type="text" maxLength={120} required placeholder="e.g. Walk-in fridge" /></div>
          <div><label htmlFor="min-temp">Minimum °C</label><input id="min-temp" name="min_temp_c" type="number" min="-30" max="99.9" step="0.1" required /></div>
          <div><label htmlFor="max-temp">Maximum °C</label><input id="max-temp" name="max_temp_c" type="number" min="-29.9" max="100" step="0.1" required /></div>
          <div><label htmlFor="interval">Check every (minutes)</label><input id="interval" name="check_interval_minutes" type="number" min="1" max="1440" step="1" defaultValue="240" required /></div>
          <div><label htmlFor="cutoff">Daily cutoff</label><input id="cutoff" name="daily_cutoff_time" type="time" defaultValue="23:59" required /></div>
          {errorMessage && <div className="error-box full-field" role="alert">{errorMessage}</div>}
          <SubmitButton className="primary-button full-field" pendingLabel="Adding location…">Add location</SubmitButton>
        </form>
      </section>
    </main>
  );
}
