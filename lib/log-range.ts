export type LogRangeKey = "7" | "30" | "custom";

export type ResolvedLogRange = {
  key: LogRangeKey;
  from: Date;
  toExclusive: Date;
  fromDate: string;
  toDate: string;
  label: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function safeTimeZone(value: unknown) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : "Europe/Berlin";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "Europe/Berlin";
  }
}

function localDateString(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function zonedMidnightToUtc(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const shownAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess -= shownAsUtc - target;
  }
  return new Date(guess);
}

export function resolveLogRange(
  values: { range?: string; from?: string; to?: string },
  timeZoneValue: unknown,
  now = new Date(),
): ResolvedLogRange {
  const timeZone = safeTimeZone(timeZoneValue);
  const today = localDateString(now, timeZone);
  const requestedKey: LogRangeKey = values.range === "30" || values.range === "custom" ? values.range : "7";
  let fromDate = requestedKey === "30" ? addCalendarDays(today, -29) : addCalendarDays(today, -6);
  let toDate = today;
  let key = requestedKey;

  if (requestedKey === "custom") {
    const validFrom = typeof values.from === "string" && DATE_PATTERN.test(values.from);
    const validTo = typeof values.to === "string" && DATE_PATTERN.test(values.to);
    const span = validFrom && validTo
      ? (Date.parse(`${values.to}T00:00:00Z`) - Date.parse(`${values.from}T00:00:00Z`)) / 86_400_000
      : -1;
    if (validFrom && validTo && span >= 0 && span <= 366) {
      fromDate = values.from!;
      toDate = values.to!;
    } else {
      key = "7";
    }
  }

  return {
    key,
    from: zonedMidnightToUtc(fromDate, timeZone),
    toExclusive: zonedMidnightToUtc(addCalendarDays(toDate, 1), timeZone),
    fromDate,
    toDate,
    label: key === "7" ? "Last 7 days" : key === "30" ? "Last 30 days" : `${fromDate} to ${toDate}`,
  };
}

export function logRangeQuery(range: ResolvedLogRange) {
  const query = new URLSearchParams({ range: range.key });
  if (range.key === "custom") {
    query.set("from", range.fromDate);
    query.set("to", range.toDate);
  }
  return query;
}
