"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();

  // logout() clears the cookie then redirects to the central auth login.
  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="app-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-10 w-10 mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-sky-500/15" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
        </div>
        <p className="text-zinc-400">Déconnexion en cours…</p>
      </div>
    </div>
  );
}
