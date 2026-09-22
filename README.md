# TempProof — Step 2

Employee QR temperature logging, offline retry queue, QR PDF printing, and authenticated QR rotation.

## Run locally

1. Run `../tempproof_supabase_schema.sql` in a fresh Supabase project.
2. Copy `.env.example` to `.env.local` and provide the Supabase URL and anonymous key.
3. Set `NEXT_PUBLIC_APP_URL` to the public origin that printed QR codes should open.
4. Run `npm install` and `npm run dev`.

The employee route is `/log/<active-qr-token>`. The manager QR controls are rendered at `/dashboard/locations/<location-id>` once a Supabase Auth session exists in the browser.

## Security and reliability

- Employee pages use only the Supabase anonymous key and the two `SECURITY DEFINER` RPCs.
- Manager routes verify the Supabase Auth user and rely on RLS/`owns_business`.
- Each submission carries a UUID idempotency key; database uniqueness prevents duplicate rows during reconnect retries.
- Temporary failures are retained in local storage, capped at 20 readings, and retried online and every 15 seconds.
- Validation failures remain queued as blocked rather than being silently discarded.
