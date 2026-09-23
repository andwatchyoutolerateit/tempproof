import Link from "next/link";
import { LoginForm } from "./login-form";

const confirmationErrors: Record<string, string> = {
  "confirmation-expired": "This confirmation link is invalid or has expired. Return to sign up and request a new email.",
  "confirmation-failed": "We could not confirm your email. Return to sign up and request a new confirmation email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Log in</h1>
        <p className="auth-intro">Open your temperature compliance dashboard.</p>
        {error && confirmationErrors[error] && <div className="error-box" role="alert">{confirmationErrors[error]}</div>}
        <LoginForm />
        <p className="auth-switch">New to TempProof? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
