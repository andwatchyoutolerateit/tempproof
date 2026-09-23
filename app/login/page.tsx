import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Log in</h1>
        <p className="auth-intro">Open your temperature compliance dashboard.</p>
        <LoginForm />
        <p className="auth-switch">New to TempProof? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
