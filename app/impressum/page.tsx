import Link from "next/link";

export const metadata = { title: "Impressum — TempProof" };

export default function ImpressumPage() {
  return (
    <main className="legal-shell" lang="de">
      <article className="legal-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Impressum</h1>
        <p>Angaben gemäß § 5 DDG</p>

        <h2>Anbieter</h2>
        <p>
          [FILL IN: Ihr vollständiger rechtlicher Name bzw. Firmenname]<br />
          [FILL IN: Rechtsform, falls zutreffend]<br />
          [FILL IN: Straße und Hausnummer]<br />
          [FILL IN: Postleitzahl und Ort]<br />
          [FILL IN: Land]
        </p>

        <h2>Vertretungsberechtigte Person</h2>
        <p>[FILL IN: Name der vertretungsberechtigten Person, falls zutreffend]</p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: [FILL IN: Kontakt-E-Mail-Adresse]<br />
          Telefon: [FILL IN: Telefonnummer, falls vorhanden]
        </p>

        <h2>Register- und Steuerangaben</h2>
        <p>
          [FILL IN: Registergericht und Registernummer, falls zutreffend]<br />
          [FILL IN: Umsatzsteuer-Identifikationsnummer, falls vorhanden]
        </p>

        <p className="legal-note">
          Diese Platzhalter müssen vor dem öffentlichen kommerziellen Betrieb mit den tatsächlichen Pflichtangaben ersetzt werden.
        </p>
      </article>
    </main>
  );
}
