"use server";

import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) redirect("/onboarding?error=invalid-name");

  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (existingBusiness) redirect("/dashboard");

  const { error } = await supabase.from("businesses").insert({
    name,
    owner_user_id: authData.user.id,
  });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);

  redirect("/dashboard");
}
