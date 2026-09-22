import { QrActions } from "@/components/qr-actions";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Sign in required</h1></div></main>;
  }
  const { data: location } = await supabase
    .from("locations")
    .select("id,name,min_temp_c,max_temp_c")
    .eq("id", locationId)
    .single();
  if (!location) {
    return <main className="dashboard-shell"><div className="dashboard-card"><h1>Location not found</h1></div></main>;
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-card">
        <div className="brand">TempProof</div>
        <h1>{location.name}</h1>
        <p className="range">Acceptable range: <strong>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</strong></p>
        <QrActions locationId={location.id} locationName={location.name} />
      </div>
    </main>
  );
}
