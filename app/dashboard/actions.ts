"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function createLocation(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const minTemp = Number(formData.get("min_temp_c"));
  const maxTemp = Number(formData.get("max_temp_c"));
  const interval = Number(formData.get("check_interval_minutes"));
  const cutoff = String(formData.get("daily_cutoff_time") ?? "");

  const valid = name.length > 0 && name.length <= 120
    && Number.isFinite(minTemp) && Number.isFinite(maxTemp) && minTemp < maxTemp
    && minTemp >= -30 && maxTemp <= 100
    && Number.isInteger(interval) && interval >= 1 && interval <= 1440
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff);
  if (!valid) redirect("/dashboard?error=invalid-location");

  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (!business) redirect("/onboarding");

  const { error } = await supabase.from("locations").insert({
    business_id: business.id,
    name,
    min_temp_c: minTemp,
    max_temp_c: maxTemp,
    check_interval_minutes: interval,
    daily_cutoff_time: cutoff,
  });
  if (error) redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
