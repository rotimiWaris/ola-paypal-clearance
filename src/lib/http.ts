const hits: number[] = [];

export function tooFast(limit = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  while (hits.length > 0 && hits[0]! < now - windowMs) hits.shift();
  if (hits.length >= limit) return true;
  hits.push(now);
  return false;
}

export function originFrom(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  const internal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".internal");
  if (!internal) return url.origin;
  const forwarded = request.headers.get("x-forwarded-host")?.split(",").at(-1)?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",").at(-1)?.trim();
  if (
    forwarded &&
    /^[a-z0-9.-]+(?::\d+)?$/i.test(forwarded) &&
    (proto === "http" || proto === "https")
  ) {
    return `${proto}://${forwarded}`;
  }
  return url.origin;
}
