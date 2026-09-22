import { NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  const { locationId } = await params;
  const supabase = await createAuthenticatedSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const { data, error } = await supabase.rpc("rotate_qr_code", { target_location_id: locationId });
  if (error) {
    const unauthorized = /not authorized/i.test(error.message);
    return NextResponse.json(
      { message: unauthorized ? "You do not have access to this location." : "The QR code could not be replaced. The old code is still active." },
      { status: unauthorized ? 403 : 500 },
    );
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.new_token) {
    return NextResponse.json({ message: "The QR code could not be replaced. The old code is still active." }, { status: 500 });
  }
  return NextResponse.json({ newToken: row.new_token });
}
