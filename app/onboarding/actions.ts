"use server";

import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) redirect("/onboarding?error=invalid-name");

  let destination = "/onboarding?error=service-unavailable";
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      destination = "/login";
    } else {
      const { data: existingBusiness, error: lookupError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_user_id", authData.user.id)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        destination = "/onboarding?error=service-unavailable";
      } else if (existingBusiness) {
        destination = "/dashboard";
      } else {
        const { error: insertError } = await supabase.from("businesses").insert({
          name,
          owner_user_id: authData.user.id,
        });
        destination = insertError ? "/onboarding?error=create-business-failed" : "/dashboard";
      }
    }
  } catch {
    destination = "/onboarding?error=service-unavailable";
  }

  redirect(destination);
}
