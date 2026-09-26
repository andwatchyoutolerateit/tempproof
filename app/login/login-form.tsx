"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resendConfirmationAction, signInAction } from "@/app/auth/actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResendMessage("");
    setUnconfirmedEmail("");
    setSubmitting(true);
    try {
      const result = await signInAction(email, password);
      if (result.status === "unconfirmed") {
        setUnconfirmedEmail(email);
        setError(result.message ?? "Please confirm your email before logging in.");
        return;
      }
      if (result.status === "error") {
        setError(result.message ?? "We could not log you in right now.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    setResending(true);
    setError("");
    setResendMessage("");
    try {
      const result = await resendConfirmationAction(unconfirmedEmail);
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

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <label htmlFor="login-email">Email</label>
      <input id="login-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="login-password">Password</label>
      <input id="login-password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <p className="form-assist"><Link href="/forgot-password">Forgot password?</Link></p>
      {error && <div className="error-box" role="alert">{error}</div>}
      {unconfirmedEmail && (
        <button className="secondary-button confirmation-resend" type="button" onClick={resendConfirmation} disabled={resending || resendCooldown > 0}>
          {resending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
        </button>
      )}
      {resendMessage && <div className="success-box" role="status">{resendMessage}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
