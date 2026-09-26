import { QrActions } from "@/components/qr-actions";
import Link from "next/link";
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
        <div className="brand">TempProof</div>
        <p><Link href="/dashboard">← Back to dashboard</Link></p>
        <h1>{location.name}</h1>
        <p className="range">Acceptable range: <strong>{Number(location.min_temp_c)}°C to {Number(location.max_temp_c)}°C</strong></p>
        <QrActions locationId={location.id} locationName={location.name} />
      </div>
    </main>
  );
}
