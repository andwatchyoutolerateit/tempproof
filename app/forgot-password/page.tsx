import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Reset your password</h1>
        <p className="auth-intro">Enter your account email and we’ll send you a secure reset link.</p>
        <ForgotPasswordForm />
        <p className="auth-switch"><Link href="/login">Back to log in</Link></p>
      </section>
    </main>
  );
}
