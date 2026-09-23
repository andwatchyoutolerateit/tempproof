"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  function confirmationRedirectUrl() {
    return `${window.location.origin}/auth/confirm`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmationRedirectUrl() },
    });

    if (signupError) {
      setError(signupError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setConfirmationEmail(email);
    setSubmitting(false);
  }

  async function resendConfirmation() {
    setError("");
    setResendMessage("");
    setResending(true);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo: confirmationRedirectUrl() },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResendMessage("A new confirmation email has been sent.");
  }

  if (confirmationEmail) {
    return (
      <div className="confirmation-panel" aria-live="polite">
        <div className="confirmation-icon" aria-hidden="true">✉</div>
        <h2>Check your email</h2>
        <p>We sent a confirmation link to <strong>{confirmationEmail}</strong>.</p>
        <p>Open the link to verify your account. You will then continue to business setup.</p>
        <p className="field-hint">The link may take a few minutes to arrive. Check your spam folder too.</p>
        {error && <div className="error-box" role="alert">{error}</div>}
        {resendMessage && <div className="success-box">{resendMessage}</div>}
        <button className="secondary-button confirmation-resend" type="button" onClick={resendConfirmation} disabled={resending}>
          {resending ? "Sending…" : "Resend confirmation email"}
        </button>
        <p className="auth-switch"><Link href="/login">Back to log in</Link></p>
      </div>
    );
  }

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <label htmlFor="signup-email">Email</label>
      <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="signup-password">Password</label>
      <input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <p className="field-hint">Use at least 8 characters.</p>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
