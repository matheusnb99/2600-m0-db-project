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

  // `habilitation_niveau` is the BLP level 0..3 embedded at login. Default to
  // 0 (NC) if a legacy token without it is presented.
  const niveau =
    typeof payload.habilitation_niveau === "number"
      ? payload.habilitation_niveau
      : 0;

  return { agentId: String(payload.agent_id), niveau };
}
