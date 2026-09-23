import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Create your account</h1>
        <p className="auth-intro">Set up temperature compliance for your business.</p>
        <SignupForm />
        <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
      </section>
    </main>
  );
}
