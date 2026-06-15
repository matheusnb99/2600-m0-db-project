"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout();
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push("/login");
    }, 500);
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          Déconnexion en cours...
        </p>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
