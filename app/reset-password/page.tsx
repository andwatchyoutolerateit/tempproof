import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createAuthenticatedSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?error=confirmation-failed");

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Choose a new password</h1>
        <p className="auth-intro">Use at least 8 characters and keep it somewhere safe.</p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
