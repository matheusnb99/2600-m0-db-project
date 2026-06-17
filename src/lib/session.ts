/**
 * Request → token → Bell-LaPadula session context.
 *
 * The JWT is carried as a host-scoped cookie set by the central auth service
 * (port 3000). Cookies ignore the port, so the same cookie is sent to every
 * microservice (3001+) on the host — that's how the session crosses services.
 * A `Authorization: Bearer` header is still accepted as a fallback.
 *
 * Returns null when no valid token is present — callers then run without a
 * session, so RLS-protected tables correctly return nothing.
 */
import { verifyToken } from "./auth";
import type { SessionContext } from "./db";

/** Name of the JWT cookie shared across all services on the host. */
export const TOKEN_COOKIE = "taj_token";

/**
 * Cookie carrying the chosen Bell-LaPadula "working level" (0..3). The agent may
 * *lower* their session level to write to lower-classified rows (No Write Down
 * means a high-clearance subject must step down to touch low data). It is read
 * and **clamped** server-side to `≤ habilitation`, so a tampered cookie can never
 * grant more than the agent's cleared maximum.
 */
export const LEVEL_COOKIE = "taj_level";

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/** Extract the raw JWT from the cookie, or the Bearer header as a fallback. */
export function getToken(request: Request): string | null {
  const cookie = readCookie(request, TOKEN_COOKIE);
  if (cookie) return cookie;

  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

export function getSessionContext(request: Request): SessionContext | null {
  const token = getToken(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.agent_id) {
    return null;
  }

  // `habilitation_niveau` is the BLP clearance 0..3 embedded at login — the
  // agent's MAXIMUM. Default to 0 (NC) if a legacy token without it is presented.
  const habilitation =
    typeof payload.habilitation_niveau === "number"
      ? payload.habilitation_niveau
      : 0;

  // Effective session level = the chosen working level, clamped to [0, max].
  // No cookie → work at full clearance (back-compatible default).
  const raw = readCookie(request, LEVEL_COOKIE);
  const wanted = raw != null ? parseInt(raw, 10) : NaN;
  const niveau = Number.isInteger(wanted)
    ? Math.max(0, Math.min(wanted, habilitation))
    : habilitation;

  return { agentId: String(payload.agent_id), niveau };
}
