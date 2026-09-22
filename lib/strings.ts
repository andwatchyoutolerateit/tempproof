export type AppLanguage = "en" | "de";

export const copy = {
  en: {
    temperature: "Temperature",
    acceptable: "Acceptable range",
    actionTitle: "What did you do to correct it?",
    actionPlaceholder: "Example: Moved food to backup fridge and told manager",
    actionHint: "Required because this reading is outside the acceptable range.",
    detailWarning: "Add a bit more detail so this holds up in an inspection.",
    submit: "Log temperature",
    submitting: "Saving…",
    logged: "Temperature logged",
    loggedAt: "Logged at",
    localSaved: "Saved locally",
    localDetail: "Will sync when back online.",
    queueFull: "This device already has 20 unsynced readings. Reconnect before adding another; this reading is still on screen.",
    waitingSync: "reading(s) waiting to sync.",
    invalidTitle: "This code is no longer active",
    invalidBody: "Ask your manager for a new one.",
    invalidTemperature: "Enter a temperature from -30°C to 100°C, using no more than one decimal place.",
    actionRequired: "Describe the corrective action before submitting.",
  },
  de: {
    temperature: "Temperatur",
    acceptable: "Zulässiger Bereich",
    actionTitle: "Was wurde zur Korrektur unternommen?",
    actionPlaceholder: "Beispiel: Lebensmittel in Ersatzkühlschrank gelegt und Leitung informiert",
    actionHint: "Erforderlich, da dieser Messwert außerhalb des zulässigen Bereichs liegt.",
    detailWarning: "Bitte etwas genauer beschreiben, damit der Eintrag einer Kontrolle standhält.",
    submit: "Temperatur eintragen",
    submitting: "Wird gespeichert…",
    logged: "Temperatur gespeichert",
    loggedAt: "Gespeichert um",
    localSaved: "Lokal gespeichert",
    localDetail: "Wird synchronisiert, sobald wieder eine Verbindung besteht.",
    queueFull: "Auf diesem Gerät warten bereits 20 Einträge. Bitte zuerst verbinden; dieser Messwert bleibt auf dem Bildschirm.",
    waitingSync: "Einträge warten auf die Synchronisierung.",
    invalidTitle: "Dieser Code ist nicht mehr aktiv",
    invalidBody: "Bitte die Leitung um einen neuen Code.",
    invalidTemperature: "Temperatur zwischen -30°C und 100°C mit höchstens einer Nachkommastelle eingeben.",
    actionRequired: "Bitte vor dem Speichern die Korrekturmaßnahme beschreiben.",
  },
} as const;

export function formatTemperature(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}
