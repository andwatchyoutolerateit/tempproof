"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function friendlyAuthError(message: string, code?: string) {
    if (code === "over_email_send_rate_limit" || /rate limit|security purposes/i.test(message)) {
      return "Too many emails were requested. Please wait about an hour before trying again.";
    }
    if (/already registered|already exists/i.test(message)) {
      return "If you already have an account, log in instead.";
    }
    return message;
  }

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
      setError(friendlyAuthError(signupError.message, signupError.code));
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setConfirmationEmail(email);
    setResendCooldown(60);
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
      setError(friendlyAuthError(resendError.message, resendError.code));
      return;
    }
    setResendCooldown(60);
    setResendMessage("If this address still needs confirmation, a new email will arrive shortly.");
  }

  if (confirmationEmail) {
    return (
      <div className="confirmation-panel" aria-live="polite">
        <div className="confirmation-icon" aria-hidden="true">✉</div>
        <h2>Check your email</h2>
        <p>If this address is eligible for a new account, a confirmation link will arrive at <strong>{confirmationEmail}</strong>.</p>
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
