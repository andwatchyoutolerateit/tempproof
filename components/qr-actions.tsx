"use client";

import { useState } from "react";

export function QrActions({ locationId, locationName }: { locationId: string; locationName: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pdfUrl = `/api/locations/${encodeURIComponent(locationId)}/qr.pdf`;

  async function downloadPdf() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(pdfUrl, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Could not create the QR PDF.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `TempProof-${locationName.replace(/[^a-z0-9_-]+/gi, "-")}-QR.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      setMessage("QR PDF downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the QR PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceQr() {
    const confirmed = window.confirm(
      "The old QR code will stop working immediately — make sure to reprint and swap the sticker.",
    );
    if (!confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/locations/${encodeURIComponent(locationId)}/rotate-qr`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not replace the QR code.");
      setMessage("QR replaced. Preparing the new printable PDF…");
      setBusy(false);
      await downloadPdf();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not replace the QR code.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => void downloadPdf()} disabled={busy}>
          Print QR
        </button>
        <button className="danger-button" type="button" onClick={() => void replaceQr()} disabled={busy}>
          Replace QR code
        </button>
      </div>
      {message && <p className="button-message" role="status">{message}</p>}
    </div>
  );
}
