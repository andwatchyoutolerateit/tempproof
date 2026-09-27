import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { resolveLogRange, safeTimeZone } from "@/lib/log-range";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BATCH_SIZE = 1000;
const MAX_EXPORT_ROWS = 50_000;

export type ExportLog = {
  id: string;
  temperature_c: number | string;
  is_out_of_range: boolean;
  corrective_action: string | null;
  logged_at: string;
};

export async function loadLogExport(locationId: string, requestUrl: string) {
  if (!UUID.test(locationId)) return { error: "Location not found.", status: 404 } as const;

  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: "Sign in required.", status: 401 } as const;

  const locationResult = await supabase
    .from("locations")
    .select("id,business_id,name,min_temp_c,max_temp_c")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();
  if (locationResult.error || !locationResult.data) return { error: "Location not found.", status: 404 } as const;

  const businessResult = await supabase
    .from("businesses")
    .select("name,timezone")
    .eq("id", locationResult.data.business_id)
    .single();
  if (businessResult.error || !businessResult.data) return { error: "Business not found.", status: 404 } as const;

  const url = new URL(requestUrl);
  const timeZone = safeTimeZone(businessResult.data.timezone);
  const range = resolveLogRange({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  }, timeZone);

  const logs: ExportLog[] = [];
  for (let offset = 0; offset < MAX_EXPORT_ROWS; offset += BATCH_SIZE) {
    const result = await supabase
      .from("temperature_logs")
      .select("id,temperature_c,is_out_of_range,corrective_action,logged_at")
      .eq("location_id", locationId)
      .gte("logged_at", range.from.toISOString())
      .lt("logged_at", range.toExclusive.toISOString())
      .order("logged_at", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);
    if (result.error) throw result.error;
    const batch = (result.data ?? []) as ExportLog[];
    logs.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  return {
    data: {
      location: locationResult.data,
      business: { ...businessResult.data, timezone: timeZone },
      range,
      logs,
      truncated: logs.length === MAX_EXPORT_ROWS,
    },
  } as const;
}

export function safeExportFilename(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "location";
}
