import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/session";

/**
 * POST /api/auth/logout — clears the host-scoped session cookie.
 * (HttpOnly, so the client can't clear it itself.)
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
