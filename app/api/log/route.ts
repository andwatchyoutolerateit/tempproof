import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function friendlyDatabaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("corrective action")) {
    return { status: 422, message: "This temperature is outside the current range. Add a corrective action and submit again." };
  }
  if (lower.includes("invalid or inactive qr") || lower.includes("location is unavailable")) {
    return { status: 410, message: "This code is no longer active. Ask your manager for a new one." };
  }
  if (lower.includes("temperature") || lower.includes("numeric") || lower.includes("range")) {
    return { status: 422, message: "Check the temperature and try again." };
  }
  return { status: 503, message: "TempProof could not reach the log right now. Your reading can be saved locally and retried." };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "The submitted reading is not valid." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "The submitted reading is not valid." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const token = typeof value.token === "string" ? value.token : "";
  const temperature = typeof value.temperature === "number" ? value.temperature : NaN;
  const correctiveAction = typeof value.correctiveAction === "string" ? value.correctiveAction.trim() : null;
  const idempotencyKey = typeof value.idempotencyKey === "string" ? value.idempotencyKey : "";

  if (!/^[0-9a-f]{48}$/.test(token) || !UUID.test(idempotencyKey)) {
    return NextResponse.json({ message: "The submitted reading is not valid." }, { status: 400 });
  }
  if (!Number.isFinite(temperature) || temperature < -30 || temperature > 100 || Math.round(temperature * 10) !== temperature * 10) {
    return NextResponse.json({ message: "Enter a temperature from -30°C to 100°C, using no more than one decimal place." }, { status: 422 });
  }
  if (correctiveAction && correctiveAction.length > 500) {
    return NextResponse.json({ message: "Corrective action must be 500 characters or fewer." }, { status: 422 });
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("submit_temperature_log", {
    qr_token: token,
    measured_temperature_c: temperature,
    action_taken: correctiveAction,
    idempotency_key: idempotencyKey,
  });
  if (error) {
    const friendly = friendlyDatabaseError(error.message);
    return NextResponse.json({ message: friendly.message }, { status: friendly.status });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return NextResponse.json({ message: "The reading could not be confirmed. It is safe to retry." }, { status: 503 });
  }
  return NextResponse.json({
    logId: row.log_id,
    loggedAt: row.logged_at,
    isOutOfRange: row.is_out_of_range,
  });
}
