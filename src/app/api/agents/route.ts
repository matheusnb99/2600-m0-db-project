import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionContext } from "@/lib/session";
import { pgErrorResponse } from "@/lib/api-error";
import type { Agent } from "@/types";

/**
 * GET /api/agents
 * List all agents with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const service_id = searchParams.get("service_id");
    const role_id = searchParams.get("role_id");
    const actif = searchParams.get("actif");

    let sql = `
      SELECT 
        a.id, a.matricule, a.nom, a.prenom, a.email, a.role_id, a.service_id,
        a.habilitation_niveau_id, a.actif, a.tentatives_echouees, a.verrouille,
        a.date_creation, a.date_modification
      FROM agents a
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (service_id) {
      params.push(parseInt(service_id));
      sql += ` AND a.service_id = $${params.length}`;
    }

    if (role_id) {
      params.push(parseInt(role_id));
      sql += ` AND a.role_id = $${params.length}`;
    }

    if (actif !== null) {
      params.push(actif === "true");
      sql += ` AND a.actif = $${params.length}`;
    }

    sql += ` ORDER BY a.nom, a.prenom`;

    // Pass the RLS session so the agents policy (08) can resolve the magistrat
    // "own service" branch — it reads app.agent_id via fn_session_agent_id().
    // Without it, fn_session_agent_id() is NULL and magistrat sees no rows.
    const agents = await query<Agent>(sql, params, getSessionContext(request));

    return NextResponse.json(agents, { status: 200 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la récupération des agents");
  }
}

/**
 * POST /api/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSessionContext(request);
    const body = await request.json();

    const {
      matricule,
      nom,
      prenom,
      email,
      role_id,
      service_id,
      habilitation_niveau_id,
    } = body;

    // Validation
    if (
      !matricule ||
      !nom ||
      !prenom ||
      !email ||
      !role_id ||
      !service_id ||
      !habilitation_niveau_id
    ) {
      return NextResponse.json(
        { message: "Tous les champs requis sont obligatoires" },
        { status: 400 }
      );
    }

    // Check if matricule already exists
    const existing = await queryOne(
      `SELECT id FROM agents WHERE matricule = $1`,
      [matricule],
      session
    );

    if (existing) {
      return NextResponse.json(
        { message: "Matricule déjà utilisé" },
        { status: 400 }
      );
    }

    // Create agent with default password
    const defaultPassword = Buffer.from(`${matricule}:TempPassword123!`).toString(
      "base64"
    );

    const newAgent = await queryOne<Agent>(
      `INSERT INTO agents (matricule, nom, prenom, email, role_id, service_id, 
       habilitation_niveau_id, mot_de_passe_hash, actif, tentatives_echouees, 
       verrouille, date_creation, date_modification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 0, false, NOW(), NOW())
       RETURNING id, matricule, nom, prenom, email, role_id, service_id, 
                 habilitation_niveau_id, actif, tentatives_echouees, verrouille,
                 date_creation, date_modification`,
      [
        matricule,
        nom,
        prenom,
        email,
        role_id,
        service_id,
        habilitation_niveau_id,
        defaultPassword,
      ],
      session
    );

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    return pgErrorResponse(error, "Erreur lors de la création de l'agent");
  }
}
