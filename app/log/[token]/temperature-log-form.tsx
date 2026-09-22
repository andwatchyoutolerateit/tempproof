"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppLanguage, copy, formatTemperature } from "@/lib/strings";
import { PendingLog, sendTemperatureLog, useOfflineQueue } from "./use-offline-queue";

type Props = {
  token: string;
  locationName: string;
  minTemp: number;
  maxTemp: number;
  language: AppLanguage;
};

type Completion = { kind: "saved" | "queued"; time?: string } | null;

export function TemperatureLogForm({ token, locationName, minTemp, maxTemp, language }: Props) {
  const t = copy[language];
  const [temperature, setTemperature] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [forceAction, setForceAction] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState<Completion>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { enqueue, pendingCount, blockedMessage } = useOfflineQueue();

  const parsed = temperature === "" ? null : Number(temperature.replace(",", "."));
  const oneDecimal = /^-?\d+(?:[.,]\d)?$/.test(temperature.trim());
  const validTemperature = parsed !== null && Number.isFinite(parsed) && parsed >= -30 && parsed <= 100 && oneDecimal;
  const appearsOutOfRange = validTemperature && parsed !== null && (parsed < minTemp || parsed > maxTemp);
  const needsAction = appearsOutOfRange || forceAction;
  const shortAction = correctiveAction.trim().length > 0 && correctiveAction.trim().length < 10;
  const rangeLabel = useMemo(
    () => `${formatTemperature(minTemp)}°C to ${formatTemperature(maxTemp)}°C`,
    [minTemp, maxTemp],
  );

  useEffect(() => {
    if (!completion) return;
    const timer = window.setTimeout(() => {
      setCompletion(null);
      setTemperature("");
      setCorrectiveAction("");
      setForceAction(false);
      setError("");
      inputRef.current?.focus();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [completion]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!validTemperature || parsed === null) {
      setError(t.invalidTemperature);
      inputRef.current?.focus();
      return;
    }
    if (needsAction && !correctiveAction.trim()) {
      setError(t.actionRequired);
      return;
    }

    const entry: PendingLog = {
      idempotencyKey: crypto.randomUUID(),
      token,
      temperature: parsed,
      correctiveAction: needsAction ? correctiveAction.trim() : null,
      createdAt: new Date().toISOString(),
    };
    setSubmitting(true);
    const result = await sendTemperatureLog(entry);
    setSubmitting(false);

    if (result.kind === "success") {
      setCompletion({ kind: "saved", time: result.loggedAt });
      return;
    }
    if (result.kind === "temporary") {
      if (enqueue(entry)) setCompletion({ kind: "queued" });
      else setError(t.queueFull);
      return;
    }

    if (/corrective action/i.test(result.message)) setForceAction(true);
    setError(result.message);
  }

  if (completion) {
    const localTime = completion.time
      ? new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        }).format(new Date(completion.time))
      : undefined;
    return (
      <section className="log-card success-view" aria-live="assertive">
        <div className="checkmark" aria-hidden="true">✓</div>
        <h2>{completion.kind === "saved" ? t.logged : t.localSaved}</h2>
        <p>{completion.kind === "saved" ? `${t.loggedAt} ${localTime}` : t.localDetail}</p>
      </section>
    );
  }

  return (
    <section className="log-card">
      <div className="brand">TempProof</div>
      <h1>{locationName}</h1>
      <p className="range">{t.acceptable}: <strong>{rangeLabel}</strong></p>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="temperature">{t.temperature}</label>
        <div className="temperature-wrap">
          <input
            ref={inputRef}
            id="temperature"
            className="temperature-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={temperature}
            onChange={(event) => {
              setTemperature(event.target.value);
              setForceAction(false);
              setError("");
            }}
            aria-describedby="temperature-help"
            autoFocus
          />
          <span className="degree" aria-hidden="true">°C</span>
        </div>
        <p id="temperature-help" className="hint">−30°C–100°C · 0.1°C</p>

        {needsAction && (
          <div className="action-panel">
            <label htmlFor="corrective-action">{t.actionTitle}</label>
            <textarea
              id="corrective-action"
              value={correctiveAction}
              maxLength={500}
              onChange={(event) => { setCorrectiveAction(event.target.value); setError(""); }}
              placeholder={t.actionPlaceholder}
            />
            <p className="hint">{t.actionHint}</p>
            {shortAction && <p className="warning">{t.detailWarning}</p>}
          </div>
        )}

        {error && <div className="error-box" role="alert">{error}</div>}
        {pendingCount > 0 && <div className="offline-box">{pendingCount} {t.waitingSync}</div>}
        {blockedMessage && <div className="error-box" role="alert">Unsynced reading: {blockedMessage}</div>}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </button>
      </form>
    </section>
  );
}
