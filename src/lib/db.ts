/**
 * Database Connection Module
 * Connects to PostgreSQL with connection pooling
 */

import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let authPool: pg.Pool | null = null;

/**
 * Bell-LaPadula session context for a request.
 *
 * The RLS policies (08_rls_policies.sql) filter rows via fn_session_level(),
 * which reads the GUC `app.session_level`. If we never set it, it defaults to
 * -1 and every classified row is hidden — which is exactly why non-postgres
 * users see an empty `personnes` table. We must open a session per request.
 */
export interface SessionContext {
  /** UUID of the authenticated agent (becomes app.agent_id). */
  agentId: string;
  /** BLP session level 0..3 (NC/CD/SD/TSD) → app.session_level. */
  niveau: number;
}

/**
 * Data pool — connects as DB_USER. In the demo this is one of the swappable
 * `taj_*` login roles, so every data query is governed by that role's RBAC
 * GRANTs (and, combined with the per-request session GUCs, by the RLS / BLP
 * policies). Swapping DB_USER in `.env` is how a role is "switched".
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const pgConfig = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "taj",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(pgConfig);

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
}

/**
 * Auth pool — a separate, fixed connection used ONLY by the (cosmetic) login
 * endpoint. Authentication needs to read `agents`, update its lockout
 * bookkeeping and write `audit_log` — privileges the least-privilege `taj_*`
 * data roles deliberately do not have. Keeping auth on its own privileged
 * identity (like a dedicated auth microservice) means the data pool can stay
 * a pure, swappable least-privilege role without breaking login.
 *
 * Falls back to the data-pool credentials when AUTH_DB_* is unset.
 */
export function getAuthPool(): pg.Pool {
  if (!authPool) {
    authPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "taj",
      user: process.env.AUTH_DB_USER || process.env.DB_USER || "postgres",
      password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD || "",
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    authPool.on("error", (err) => {
      console.error("Unexpected error on idle auth client", err);
    });
  }

  return authPool;
}

/**
 * Run a query on the privileged auth pool (no RLS session context). Use only
 * for the authentication endpoint.
 */
export async function authQuery<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getAuthPool().query(text, params);
  return result.rows;
}

export async function authQueryOne<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await authQuery<T>(text, params);
  return results.length > 0 ? results[0] : null;
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = [],
  session?: SessionContext | null
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    if (session) {
      // Wrap in a transaction and set the GUCs with is_local = true so they are
      // scoped to THIS transaction only. That makes them safe with the
      // connection pool: they reset automatically on COMMIT/ROLLBACK and never
      // leak to the next request that reuses this pooled connection.
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.agent_id', $1, true), set_config('app.session_level', $2, true)",
        [session.agentId, String(session.niveau)]
      );
      const result = await client.query(text, params);
      await client.query("COMMIT");
      return result.rows;
    }
    const result = await client.query(text, params);
    return result.rows;
  } catch (err) {
    if (session) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore rollback errors */
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function queryOne<T = unknown>(
  text: string,
  params: unknown[] = [],
  session?: SessionContext | null
): Promise<T | null> {
  const results = await query<T>(text, params, session);
  return results.length > 0 ? results[0] : null;
}

export async function close(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (authPool) {
    await authPool.end();
    authPool = null;
  }
}
