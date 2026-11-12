export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function paypalAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatWhen(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(iso));
  return `${formatted} PT`;
}

const KNOWN_CATEGORIES: Record<string, string> = {
  pantry: "Pantry",
  cleaning: "Cleaning",
  disposables: "Disposables",
  equipment: "Equipment",
  unknown: "Unknown",
};

export function categoryLabel(category: string): string {
  const known = KNOWN_CATEGORIES[category];
  if (known) return known;
  return category
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function parseDollars(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isFinite(cents) || cents < 0 || cents > 100_000_000) return null;
  return cents;
}

export function endOfPacificDay(isoDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const start = new Date(`${isoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return null;
  for (let step = 0; step < 48 * 60; step += 1) {
    const candidate = new Date(start + step * 60_000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);
    const read = (type: string) => parts.find((part) => part.type === type)?.value;
    const day = `${read("year")}-${read("month")}-${read("day")}`;
    if (day === isoDate && read("hour") === "23" && read("minute") === "59") {
      return candidate.toISOString();
    }
  }
  return null;
}

export function pacificToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}
