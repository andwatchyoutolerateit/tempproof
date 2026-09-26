import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const { flow } = await searchParams;
  const recovery = flow === "recovery";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>This link is no longer valid</h1>
        <div className="error-box" role="alert">
          The link may have expired or already been used. Request a new one below.
        </div>
        <Link className="primary-link-button" href={recovery ? "/forgot-password" : "/signup"}>
          {recovery ? "Request a new reset link" : "Request a new confirmation email"}
        </Link>
        <p className="auth-switch"><Link href="/login">Back to log in</Link></p>
      </section>
    </main>
  );
}
