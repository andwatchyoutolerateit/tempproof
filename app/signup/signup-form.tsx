"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resendConfirmationAction, signUpAction } from "@/app/auth/actions";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signUpAction(email, password);
      if (result.status === "error") {
        setError(result.message ?? "We could not create the account right now.");
        return;
      }
      if (result.status === "success") {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      setConfirmationEmail(email);
      setResendCooldown(60);
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    setError("");
    setResendMessage("");
    setResending(true);
    try {
      const result = await resendConfirmationAction(confirmationEmail);
      if (result.status === "error") {
        setError(result.message ?? "We could not request another email right now.");
        return;
      }
      setResendCooldown(60);
      setResendMessage("If this address still needs confirmation, a new email will arrive shortly.");
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className="confirmation-panel" aria-live="polite">
        <div className="confirmation-icon" aria-hidden="true">✉</div>
        <h2>Check your email</h2>
        <p>If an account can be created or still needs confirmation, instructions will arrive at <strong>{confirmationEmail}</strong>.</p>
        <p>Open the link to verify your account. You will then continue to business setup.</p>
        <p className="field-hint">The link may take a few minutes to arrive. Check your spam folder too.</p>
        {error && <div className="error-box" role="alert">{error}</div>}
        {resendMessage && <div className="success-box">{resendMessage}</div>}
        <button className="secondary-button confirmation-resend" type="button" onClick={resendConfirmation} disabled={resending || resendCooldown > 0}>
          {resending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
        </button>
        <p className="auth-switch">Already registered? <Link href="/login">Log in instead</Link></p>
      </div>
    );
  }

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <label htmlFor="signup-email">Email</label>
      <input id="signup-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="signup-password">Password</label>
      <input id="signup-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <p className="field-hint">Use at least 8 characters.</p>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
