import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated agent's identity, taken straight from the verified
 * JWT cookie — no database access. This lets every data service answer "who am
 * I / am I logged in" without the privileged AUTH pool. 401 when no valid
 * token, which is the signal the client uses to redirect to the auth service.
 */
export async function GET(request: NextRequest) {
  const token = getToken(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !payload.agent_id) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  return NextResponse.json({
    agent: {
      id: payload.agent_id,
      email: payload.email,
      matricule: payload.matricule,
      prenom: payload.prenom,
      nom: payload.nom,
      role_id: payload.role_id,
      habilitation_niveau_id: payload.habilitation_niveau_id,
      habilitation_niveau: payload.habilitation_niveau,
    },
  });
}
