"use server";

import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  status: "success" | "confirmation-required" | "unconfirmed" | "error";
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { email, error: "Enter a valid email address." };
  }
  return { email, error: "" };
}

function validatePassword(value: string) {
  if (value.length < 8 || value.length > 128) {
    return "Password must contain between 8 and 128 characters.";
  }
  return "";
}

function isRateLimitError(code?: string, message?: string) {
  return code === "over_email_send_rate_limit" || /rate limit|security purposes/i.test(message ?? "");
}

function isExistingAccountError(code?: string, message?: string) {
  return code === "user_already_exists" || /already registered|already exists/i.test(message ?? "");
}

function getConfiguredAppOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for authentication email links.");
  if (process.env.VERCEL_ENV === "production" && appUrl.toLowerCase().includes("localhost")) {
    throw new Error("NEXT_PUBLIC_APP_URL must be the public production domain, not localhost.");
  }
  const parsed = new URL(appUrl);
  if (!/^https?:$/.test(parsed.protocol) || parsed.origin !== appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin with no path or trailing slash.");
  }
  return appUrl;
}

export async function signUpAction(emailValue: string, password: string): Promise<AuthActionResult> {
  const { email, error: emailError } = validateEmail(emailValue);
  const passwordError = validatePassword(password);
  if (emailError || passwordError) {
    return { status: "error", message: emailError || passwordError };
  }

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const origin = getConfiguredAppOrigin();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm?type=email` },
    });

    if (error) {
      if (isRateLimitError(error.code, error.message)) {
        return { status: "error", message: "Too many emails were requested. Please wait before trying again." };
      }
      if (isExistingAccountError(error.code, error.message)) {
        return { status: "confirmation-required" };
      }
      if (error.code === "weak_password") {
        return { status: "error", message: "Choose a stronger password and try again." };
      }
      return { status: "error", message: "We could not create the account right now. Please try again." };
    }

    return { status: data.session ? "success" : "confirmation-required" };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}

export async function signInAction(emailValue: string, password: string): Promise<AuthActionResult> {
  const { email, error: emailError } = validateEmail(emailValue);
  if (emailError || !password || password.length > 128) {
    return { status: "error", message: emailError || "Enter your password." };
  }

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { status: "success" };

    if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
      return {
        status: "unconfirmed",
        message: "Please confirm your email. Check your inbox or send a new confirmation email below.",
      };
    }
    if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
      return { status: "error", message: "Email or password is incorrect." };
    }
    return { status: "error", message: "We could not log you in right now. Please try again." };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}

export async function resendConfirmationAction(emailValue: string): Promise<AuthActionResult> {
  const { email, error: emailError } = validateEmail(emailValue);
  if (emailError) return { status: "error", message: emailError };

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const origin = getConfiguredAppOrigin();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${origin}/auth/confirm?type=email` },
    });
    if (error && isRateLimitError(error.code, error.message)) {
      return { status: "error", message: "Too many emails were requested. Please wait before trying again." };
    }
    // Keep the response neutral: confirmed, missing, and still-unconfirmed accounts look the same.
    return { status: "success" };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}

export async function requestPasswordResetAction(emailValue: string): Promise<AuthActionResult> {
  const { email, error: emailError } = validateEmail(emailValue);
  if (emailError) return { status: "error", message: emailError };

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const origin = getConfiguredAppOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?type=recovery&next=/reset-password`,
    });
    if (error && isRateLimitError(error.code, error.message)) {
      return { status: "error", message: "Too many emails were requested. Please wait before trying again." };
    }
    if (error) {
      return { status: "error", message: "We could not request a reset email right now. Please try again." };
    }
    return { status: "success" };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}

export async function updatePasswordAction(password: string, confirmation: string): Promise<AuthActionResult> {
  const passwordError = validatePassword(password);
  if (passwordError) return { status: "error", message: passwordError };
  if (password !== confirmation) return { status: "error", message: "Passwords do not match." };

  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      return { status: "error", message: "This reset link is invalid or has expired. Request a new one." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return {
        status: "error",
        message: error.code === "weak_password" ? "Choose a stronger password and try again." : "We could not update your password. Please try again.",
      };
    }

    await supabase.auth.signOut({ scope: "local" });
    return { status: "success" };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}

export async function signOutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createAuthenticatedSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error
      ? { status: "error", message: "We could not log you out. Please try again." }
      : { status: "success" };
  } catch {
    return { status: "error", message: "We could not reach the authentication service. Please try again." };
  }
}
