import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const isRecovery = type === "recovery" || requestedNext === "/reset-password";
  const next = isRecovery ? "/reset-password" : "/dashboard";
  const origin = request.nextUrl.origin;

  try {
    const supabase = await createAuthenticatedSupabaseClient();

    if (tokenHash && (type === "email" || type === "recovery")) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } else if (code) {
      // Transitional support for older PKCE links that may still be in an inbox.
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(`${origin}${next}`);
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    }
  } catch {
    // The error page below gives the user a recovery path without exposing internals.
  }

  const flow = isRecovery ? "recovery" : "signup";
  const response = NextResponse.redirect(`${origin}/auth/error?flow=${flow}`);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
