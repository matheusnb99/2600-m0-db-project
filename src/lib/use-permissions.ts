"use client";

import { useState, useEffect } from "react";

/** INSERT capability of the connected role, per business table. */
export interface InsertPerms {
  personnes: boolean;
  affaires: boolean;
  signalements: boolean;
  agents: boolean;
  services: boolean;
  roles: boolean;
}

/**
 * Reads /api/permissions once. Returns null until loaded, then the per-table
 * INSERT booleans (from has_table_privilege). Use to show/hide create buttons.
 */
export function usePermissions(): InsertPerms | null {
  const [perms, setPerms] = useState<InsertPerms | null>(null);

  useEffect(() => {
    fetch("/api/permissions", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPerms(d?.insert ?? null))
      .catch(() => setPerms(null));
  }, []);

  return perms;
}
