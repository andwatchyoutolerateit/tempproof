import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { TemperatureLogForm } from "./temperature-log-form";

type QrLocation = {
  location_name: string;
  min_temp_c: number | string;
  max_temp_c: number | string;
  language: "en" | "de";
};

export const dynamic = "force-dynamic";

export default async function LogTemperaturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("get_qr_location", { qr_token: token });
  const location = !error && Array.isArray(data) ? (data[0] as QrLocation | undefined) : undefined;

  if (error) {
    return (
      <main className="page-shell">
        <section className="status-card" role="alert">
          <div className="brand">TempProof</div>
          <h1>Couldn’t load this temperature point</h1>
          <p>Check your connection and try again.</p>
          <p lang="de">Temperaturpunkt konnte nicht geladen werden. Verbindung prüfen und erneut versuchen.</p>
        </section>
      </main>
    );
  }

  if (!location) {
    return (
      <main className="page-shell">
        <section className="status-card" aria-live="polite">
          <div className="brand">TempProof</div>
          <h1>This code is no longer active</h1>
          <p>Ask your manager for a new one.</p>
          <p lang="de">Dieser Code ist nicht mehr aktiv. Bitte die Leitung um einen neuen Code.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <TemperatureLogForm
        token={token}
        locationName={location.location_name}
        minTemp={Number(location.min_temp_c)}
        maxTemp={Number(location.max_temp_c)}
        language={location.language === "de" ? "de" : "en"}
      />
    </main>
  );
}
