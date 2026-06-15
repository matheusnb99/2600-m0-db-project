/**
 * Central authentication service convention.
 *
 * All microservices run the same image on different ports of the same host.
 * The AUTH service is the one on port 3000; it owns login and issues the JWT
 * cookie. Data services (3001+) only verify that cookie and bounce
 * unauthenticated users here. Because the auth service is always on the same
 * host, the client can derive its URL from window.location — no env needed.
 */
export const AUTH_PORT = "3000";

/** True when the current page is served by the auth service itself. */
export function isAuthService(): boolean {
  return typeof window !== "undefined" && window.location.port === AUTH_PORT;
}

/** URL of the central login page, carrying a same-host redirect target. */
export function centralLoginUrl(redirectTo?: string): string {
  const { protocol, hostname } = window.location;
  const back = redirectTo ?? window.location.href;
  return `${protocol}//${hostname}:${AUTH_PORT}/login?redirect=${encodeURIComponent(
    back
  )}`;
}

/** URL of a given microservice (same host, given port). */
export function roleServiceUrl(port: number, path = "/dashboard"): string {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${port}${path}`;
}

/**
 * Validate a post-login redirect target: only same-host URLs are allowed
 * (prevents open-redirect). With no explicit target, fall back to the portal
 * (port 80) rather than the auth service's own dashboard — the auth service
 * connects with a privileged role and isn't meant to display data.
 */
export function safeRedirect(raw: string | null): string {
  const fallback = `${window.location.protocol}//${window.location.hostname}/`;
  if (!raw) return fallback;
  try {
    const u = new URL(raw, window.location.origin);
    return u.hostname === window.location.hostname ? u.href : fallback;
  } catch {
    return fallback;
  }
}
