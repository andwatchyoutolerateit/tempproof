import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { createBusiness } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (business) redirect("/dashboard");

  const { error } = await searchParams;
  const errorMessage = error === "invalid-name" ? "Enter a business name between 1 and 120 characters." : error;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Create your business</h1>
        <p className="auth-intro">You can add your first temperature-check location next.</p>
        <form className="manager-form" action={createBusiness}>
          <label htmlFor="business-name">Business name</label>
          <input id="business-name" name="name" type="text" autoComplete="organization" maxLength={120} required autoFocus />
          {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}
          <button className="primary-button" type="submit">Create business</button>
        </form>
      </section>
    </main>
  );
}
