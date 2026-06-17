import { NextRequest, NextResponse } from "next/server";
import { authQuery, authQueryOne } from "@/lib/db";
import { pgErrorResponse } from "@/lib/api-error";
import { TOKEN_COOKIE } from "@/lib/session";
import { comparePassword, generateToken } from "@/lib/auth";
import type { AuthSession, Agent } from "@/types";

const SESSION_SECONDS = 8 * 60 * 60; // 8 h

/**
 * POST /api/auth/login
 * 
 * Authenticate agent with email and password
 * Queries the real PostgreSQL database
 * 
 * Request body:
 * {
 *   email: string
 *   password: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Query agent from database
    const agent = await authQueryOne<
      Agent & { habilitation_niveau: number; mot_de_passe_hash: string }
    >(
      `SELECT
        a.id, a.matricule, a.nom, a.prenom, a.email, a.role_id, a.service_id,
        a.habilitation_niveau_id, a.actif, a.tentatives_echouees, a.verrouille,
        a.date_creation, a.date_modification, a.mot_de_passe_hash,
        cn.niveau AS habilitation_niveau
      FROM agents a
      LEFT JOIN classification_niveaux cn ON cn.id = a.habilitation_niveau_id
      WHERE a.email = $1`,
      [email]
    );

    if (!agent) {
      // Log failed attempt
      await authQuery(
        `INSERT INTO audit_log (horodatage, action, table_cible, alerte, type_alerte, severite)
         VALUES (NOW(), 'LOGIN_FAILED', 'agents', true, 'Tentative de connexion — agent inexistant', 1)`,
        []
      );

      return NextResponse.json(
        { message: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Check if agent is active
    if (!agent.actif) {
      await authQuery(
        `INSERT INTO audit_log (agent_id, horodatage, action, table_cible, alerte, type_alerte, severite)
         VALUES ($1, NOW(), 'LOGIN_FAILED', 'agents', true, 'Tentative connexion agent inactif', 2)`,
        [agent.id]
      );

      return NextResponse.json(
        { message: "Agent inactif" },
        { status: 403 }
      );
    }

    // Check if agent is locked
    if (agent.verrouille) {
      return NextResponse.json(
        { message: "Agent verrouillé — contacter l'administrateur" },
        { status: 403 }
      );
    }

    // Verify password (using mot_de_passe_hash from database)
    const passwordValid = await comparePassword(
      password,
      agent.mot_de_passe_hash
    );

    if (!passwordValid) {
      // Increment failed attempts
      const newAttempts = agent.tentatives_echouees + 1;
      const shouldLock = newAttempts >= 3;

      await authQuery(
        `UPDATE agents SET tentatives_echouees = $1, verrouille = $2 WHERE id = $3`,
        [newAttempts, shouldLock, agent.id]
      );

      await authQuery(
        `INSERT INTO audit_log (agent_id, horodatage, action, table_cible, alerte, type_alerte, severite)
         VALUES ($1, NOW(), 'LOGIN_FAILED', 'agents', true, 'Mot de passe incorrect', 2)`,
        [agent.id]
      );

      return NextResponse.json(
        { message: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    await authQuery(
      `UPDATE agents SET tentatives_echouees = 0, derniere_connexion = NOW() WHERE id = $1`,
      [agent.id]
    );

    // Create session token. The payload is self-contained (incl. display
    // identity) so data services can show "who am I" without a DB query.
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
    const token = generateToken({
      agent_id: agent.id,
      email: agent.email,
      matricule: agent.matricule,
      prenom: agent.prenom,
      nom: agent.nom,
      role_id: agent.role_id,
      habilitation_niveau_id: agent.habilitation_niveau_id,
      // BLP session level (0..3) — used server-side to open the RLS session.
      habilitation_niveau: agent.habilitation_niveau ?? 0,
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    });

    // Remove password hash from response
    const agentSafe = { ...agent } as Partial<Agent & { mot_de_passe_hash: string }>;
    delete agentSafe.mot_de_passe_hash;

    const session: AuthSession = {
      agent: agentSafe as Agent,
      token,
      expiresAt,
    };

    // Log successful login
    await authQuery(
      `INSERT INTO audit_log (agent_id, horodatage, action, table_cible, details, severite)
       VALUES ($1, NOW(), 'LOGIN_SUCCESS', 'agents', $2, 0)`,
      [agent.id, JSON.stringify({ success: true })]
    );

    // Set the JWT as a host-scoped, HttpOnly cookie. No port in the cookie
    // scope → it is sent to every microservice (3001+) on this host. No
    // `secure` flag because the deployment is plain HTTP (VPN-protected LAN).
    const res = NextResponse.json(session, { status: 200 });
    res.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return res;
  } catch (error) {
    return pgErrorResponse(error, "Erreur interne du serveur");
  }
}
