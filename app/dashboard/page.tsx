import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { data: locationRows, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,min_temp_c,max_temp_c")
    .eq("business_id", business.id)
    .order("name");
  const locations = (locationRows ?? []) as Location[];

  const latestByLocation = new Map<string, LatestLog>();
  if (locations.length > 0) {
    const { data: logs } = await supabase
      .from("temperature_logs")
      .select("location_id,logged_at,is_out_of_range")
      .in("location_id", locations.map((location) => location.id))
      .order("logged_at", { ascending: false });
    for (const log of (logs ?? []) as LatestLog[]) {
      if (!latestByLocation.has(log.location_id)) latestByLocation.set(log.location_id, log);
    }
  }

  const { error } = await searchParams;
  const errorMessage = error === "invalid-location"
    ? "Check the location name, temperature range, interval, and cutoff time."
    : error;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><div className="brand">TempProof</div><h1>{business.name}</h1></div>
      </header>

      <section className="dashboard-card">
        <h2>Locations</h2>
        {locationsError && <div className="error-box" role="alert">{locationsError.message}</div>}
        {!locationsError && locations.length === 0 && <p className="empty-state">No locations yet. Add your first one below.</p>}
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
          <button className="primary-button full-field" type="submit">Add location</button>
        </form>
      </section>
    </main>
  );
}
