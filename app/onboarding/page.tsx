import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { createBusiness } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  let business: { id: string } | null = null;
  let authenticated = false;
  let loadError = "";
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    authenticated = !authError && Boolean(authData.user);
    if (authenticated && authData.user) {
      const { data, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_user_id", authData.user.id)
        .limit(1)
        .maybeSingle();
      if (businessError) loadError = "We could not check your business right now. Please try again.";
      business = data;
    }
  } catch {
    loadError = "TempProof is temporarily unavailable. Please refresh and try again.";
  }
  if (!authenticated && !loadError) redirect("/login");
  if (business) redirect("/dashboard");

  const { error } = await searchParams;
  const errors: Record<string, string> = {
    "invalid-name": "Enter a business name between 1 and 120 characters.",
    "create-business-failed": "The business could not be created. Please try again.",
    "service-unavailable": "TempProof could not save your business right now. Please try again.",
  };
  const errorMessage = error ? errors[error] ?? "The request could not be completed. Please try again." : "";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Create your business</h1>
        <p className="auth-intro">You can add your first temperature-check location next.</p>
        {loadError && <div className="error-box" role="alert">{loadError}</div>}
        <form className="manager-form" action={createBusiness}>
          <label htmlFor="business-name">Business name</label>
          <input id="business-name" name="name" type="text" autoComplete="organization" maxLength={120} required autoFocus />
          {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}
          <SubmitButton pendingLabel="Creating business…" className="primary-button" >Create business</SubmitButton>
        </form>
      </section>
    </main>
  );
}
