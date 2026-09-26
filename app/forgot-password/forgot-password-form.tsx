"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/confirm?next=/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setSubmitting(false);
    if (resetError) {
      setError(
        resetError.code === "over_email_send_rate_limit" || /rate limit|security purposes/i.test(resetError.message)
          ? "Too many emails were requested. Please wait about an hour before trying again."
          : resetError.message,
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="confirmation-panel" aria-live="polite">
        <div className="confirmation-icon" aria-hidden="true">✉</div>
        <h2>Check your email</h2>
        <p>If an account exists for <strong>{email}</strong>, a password-reset link will arrive shortly.</p>
        <p className="field-hint">Check Spam and Promotions too. The link can only be used once.</p>
      </div>
    );
  }

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <label htmlFor="reset-email">Email</label>
      <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
