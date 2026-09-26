"use client";

import { FormEvent, useState } from "react";
import { requestPasswordResetAction } from "@/app/auth/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await requestPasswordResetAction(email);
      if (result.status === "error") {
        setError(result.message ?? "We could not request a reset email right now.");
        return;
      }
      setSent(true);
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      <input id="reset-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
