/**
 * Authentication Utilities
 * Password hashing and JWT token management
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";

/** Cost factor — must match the seed hashes, which are `$2a$12$…`. */
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password with bcrypt (cost 12), matching the format stored in
 * `agents.mot_de_passe_hash` by the seed data (`$2a$12$…`).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a cleartext password against a stored bcrypt hash.
 *
 * The seed data stores real bcrypt hashes (`$2a$12$…`), so this must use
 * bcrypt — a pbkdf2/sha512 comparison (the previous mock) would never match
 * and every real login would fail.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * For production, use jsonwebtoken package
 */
export function generateToken(payload: Record<string, unknown>): string {
  // This is a mock implementation
  // In production, use:
  // import jwt from 'jsonwebtoken';
  // return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "secret")
    .update(`${header}.${body}`)
    .digest("base64");

  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT token
 * For production, use jsonwebtoken package
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, signature] = token.split(".");

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "secret")
      .update(`${header}.${body}`)
      .digest("base64");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64").toString("utf-8")
    );

    // Reject expired tokens (exp is a UNIX timestamp in seconds).
    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
