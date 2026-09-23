import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="brand">TempProof</div>
        <h1>Temperature compliance, made simple.</h1>
        <p>Fast QR-based temperature checks and clear records for food businesses.</p>
        <div className="home-actions">
          <Link className="home-login" href="/login">Log in</Link>
          <Link className="home-start" href="/signup">Get started</Link>
        </div>
      </section>
    </main>
  );
}
