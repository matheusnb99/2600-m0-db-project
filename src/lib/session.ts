/**
 * Request → Bell-LaPadula session context.
 *
 * Reads the JWT from the `Authorization: Bearer <token>` header (set by the
 * API client from localStorage), verifies it, and derives the agent id + BLP
 * level used to open the RLS session in db.ts.
 *
 * Returns null when no valid token is present — callers then run without a
 * session, so RLS-protected tables correctly return nothing.
 */
import { verifyToken } from "./auth";
import type { SessionContext } from "./db";

export function getSessionContext(request: Request): SessionContext | null {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const payload = verifyToken(header.slice("Bearer ".length).trim());
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
