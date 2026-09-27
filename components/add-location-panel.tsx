"use client";

import { useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createLocation } from "@/app/dashboard/actions";

export function AddLocationPanel({
  defaultExpanded,
  errorMessage,
}: {
  defaultExpanded: boolean;
  errorMessage?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || Boolean(errorMessage));
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) window.setTimeout(() => nameRef.current?.focus(), 180);
  }, [expanded]);

  return (
    <section className={`dashboard-card add-location-card${expanded ? " is-expanded" : ""}`}>
      <button
        className="add-location-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls="add-location-form-panel"
        onClick={() => setExpanded((current) => !current)}
      >
        <span>+ Add location</span>
        <span className="add-location-chevron" aria-hidden="true">⌄</span>
      </button>

      <div id="add-location-form-panel" className="add-location-panel" aria-hidden={!expanded}>
        <div className="add-location-panel-inner">
          <form className="manager-form location-form" action={createLocation}>
            <div className="full-field">
              <label htmlFor="location-name">Name</label>
              <input ref={nameRef} id="location-name" name="name" type="text" maxLength={120} required placeholder="e.g. Walk-in fridge" />
            </div>
            <div><label htmlFor="min-temp">Minimum °C</label><input id="min-temp" name="min_temp_c" type="number" min="-30" max="99.9" step="0.1" required /></div>
            <div><label htmlFor="max-temp">Maximum °C</label><input id="max-temp" name="max_temp_c" type="number" min="-29.9" max="100" step="0.1" required /></div>
            <div><label htmlFor="interval">Check every (minutes)</label><input id="interval" name="check_interval_minutes" type="number" min="1" max="1440" step="1" defaultValue="240" required /></div>
            <div><label htmlFor="cutoff">Daily cutoff</label><input id="cutoff" name="daily_cutoff_time" type="time" defaultValue="23:59" required /></div>
            {errorMessage && <div className="error-box full-field" role="alert">{errorMessage}</div>}
            <SubmitButton className="primary-button full-field" pendingLabel="Adding location…">Add location</SubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
