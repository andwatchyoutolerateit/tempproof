import Link from "next/link";

export const metadata = { title: "Datenschutz — TempProof" };

export default function DatenschutzPage() {
  return (
    <main className="legal-shell" lang="de">
      <article className="legal-card">
        <Link className="brand-link" href="/">TempProof</Link>
        <h1>Datenschutzerklärung</h1>
        <p>Stand: [FILL IN: Datum]</p>

        <h2>1. Verantwortlicher</h2>
        <p>
          [FILL IN: Ihr vollständiger rechtlicher Name bzw. Firmenname]<br />
          [FILL IN: vollständige Anschrift]<br />
          E-Mail: [FILL IN: Datenschutz-Kontaktadresse]
        </p>

        <h2>2. Welche Daten wir verarbeiten</h2>
        <ul>
          <li>Kontodaten: E-Mail-Adresse, technische Authentifizierungs- und Sitzungsdaten; Passwörter werden durch den Authentifizierungsanbieter geschützt verarbeitet und nicht im Klartext gespeichert.</li>
          <li>Unternehmensdaten: Firmenname, Standorte sowie konfigurierte Temperaturbereiche und Prüfintervalle.</li>
          <li>Temperaturprotokolle: Messwert, Zeitpunkt, Standort, Status innerhalb/außerhalb des Sollbereichs und gegebenenfalls Korrekturmaßnahmen.</li>
          <li>Technische Daten: IP-Adresse, Browser-/Geräteinformationen und Serverprotokolle, soweit dies für Betrieb, Sicherheit und Fehleranalyse erforderlich ist.</li>
        </ul>

        <h2>3. Zwecke und Rechtsgrundlagen</h2>
        <p>
          Wir verarbeiten die Daten zur Bereitstellung von TempProof, zur Kontoverwaltung, zur Dokumentation betrieblicher Temperaturkontrollen, zur IT-Sicherheit und zur Fehlerbehebung. Die Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw. vorvertragliche Maßnahmen) und Art. 6 Abs. 1 lit. f DSGVO (sicherer und zuverlässiger Betrieb). [FILL IN: weitere Rechtsgrundlagen, falls Ihr konkreter Einsatz sie erfordert]
        </p>

        <h2>4. Auftragsverarbeiter und Hosting</h2>
        <p>
          Für Datenbank, Authentifizierung und Dateidienste verwenden wir Supabase als Auftragsverarbeiter. [FILL IN: bestätigen Sie die tatsächlich gewählte Supabase-Projektregion; nennen Sie „EU“, nur wenn das Projekt nachweislich in einer EU-Region betrieben wird.] Für das Hosting der Webanwendung verwenden wir Vercel. [FILL IN: vollständige Anbieterangaben, AV-Verträge und Informationen zu möglichen Drittlandübermittlungen einschließlich geeigneter Garantien]
        </p>

        <h2>5. Speicherdauer</h2>
        <p>
          Daten werden nur so lange gespeichert, wie sie für die genannten Zwecke, den Vertrag und gesetzliche Aufbewahrungspflichten erforderlich sind. [FILL IN: konkrete Löschfristen für Konten, Temperaturprotokolle, Backups und Serverlogs]
        </p>

        <h2>6. Empfänger</h2>
        <p>
          Zugriff erhalten nur berechtigte Personen des jeweiligen Kunden und die genannten technischen Dienstleister, soweit dies für den Betrieb erforderlich ist. Eine Weitergabe erfolgt außerdem, wenn eine gesetzliche Pflicht besteht.
        </p>

        <h2>7. Ihre Rechte</h2>
        <p>
          Betroffene Personen haben nach Maßgabe der DSGVO Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden.
        </p>

        <h2>8. Sicherheit und Cookies</h2>
        <p>
          TempProof verwendet technisch notwendige Authentifizierungs-Cookies, um angemeldete Sitzungen sicher bereitzustellen. Wir treffen angemessene technische und organisatorische Sicherheitsmaßnahmen. [FILL IN: ergänzen Sie eingesetzte Analyse-, Marketing- oder weitere Cookie-Dienste, falls vorhanden]
        </p>

        <p className="legal-note">
          Diese Vorlage ist nur ein technischer Mindestentwurf und keine Rechtsberatung. Lassen Sie die endgültige Fassung für Ihr konkretes Unternehmen und Ihre tatsächlichen Dienstleister rechtlich prüfen.
        </p>
      </article>
    </main>
  );
}
