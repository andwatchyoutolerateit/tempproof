"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/app/auth/actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updatePasswordAction(password, confirmPassword);
      if (result.status === "error") {
        setError(result.message ?? "We could not update your password.");
        return;
      }
      router.push("/login?password=updated");
      router.refresh();
    } catch {
      setError("We could not reach the authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <label htmlFor="new-password">New password</label>
      <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
