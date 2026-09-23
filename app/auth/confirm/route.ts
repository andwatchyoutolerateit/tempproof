import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorCode = request.nextUrl.searchParams.get("error_code");
  const origin = request.nextUrl.origin;

  if (code) {
    const supabase = await createAuthenticatedSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/onboarding`);
  }

  const reason = errorCode === "otp_expired" ? "confirmation-expired" : "confirmation-failed";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
