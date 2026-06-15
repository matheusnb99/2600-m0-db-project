/**
 * API Client Utility
 * Centralized API requests with error handling
 */

export interface ApiError {
  message: string;
  status: number;
}

async function apiCall<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api${path}`;

  // Forward the auth token so the backend can open the RLS / Bell-LaPadula
  // session for this agent. Without it, RLS-protected tables return no rows.
  const token =
    typeof window !== "undefined" ? localStorage.getItem("taj_token") : null;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        message: data.message || "Une erreur est survenue",
        status: response.status,
      } as ApiError;
    }

    return data as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        message: "Erreur de connexion au serveur",
        status: 0,
      } as ApiError;
    }
    throw error;
  }
}

export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Agents
  fetchAgents: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/agents${query ? `?${query}` : ""}`);
  },

  fetchAgent: (id: string) => apiCall(`/agents/${id}`),

  createAgent: (data: Record<string, any>) =>
    apiCall("/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAgent: (id: string, data: Record<string, any>) =>
    apiCall(`/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  unlockAgent: (id: string) =>
    apiCall(`/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "unlock" }),
    }),

  deleteAgent: (id: string) =>
    apiCall(`/agents/${id}`, {
      method: "DELETE",
    }),

  // Services
  fetchServices: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/services${query ? `?${query}` : ""}`);
  },

  fetchService: (id: number) => apiCall(`/services/${id}`),

  createService: (data: Record<string, any>) =>
    apiCall("/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateService: (id: number, data: Record<string, any>) =>
    apiCall(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteService: (id: number) =>
    apiCall(`/services/${id}`, {
      method: "DELETE",
    }),

  // Roles
  fetchRoles: () => apiCall("/roles"),

  createRole: (data: Record<string, any>) =>
    apiCall("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Classifications
  fetchClassifications: () => apiCall("/classifications"),

  // Audit log
  fetchAudit: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/audit${query ? `?${query}` : ""}`);
  },

  // Personnes
  fetchPersonnes: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/personnes${query ? `?${query}` : ""}`);
  },

  fetchPersonne: (id: string) => apiCall(`/personnes/${id}`),

  createPersonne: (data: Record<string, any>) =>
    apiCall("/personnes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePersonne: (id: string, data: Record<string, any>) =>
    apiCall(`/personnes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePersonne: (id: string) =>
    apiCall(`/personnes/${id}`, {
      method: "DELETE",
    }),

  // Affaires
  fetchAffaires: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/affaires${query ? `?${query}` : ""}`);
  },

  fetchAffaire: (id: string) => apiCall(`/affaires/${id}`),

  createAffaire: (data: Record<string, any>) =>
    apiCall("/affaires", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAffaire: (id: string, data: Record<string, any>) =>
    apiCall(`/affaires/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAffaire: (id: string) =>
    apiCall(`/affaires/${id}`, {
      method: "DELETE",
    }),

  // Signalements
  fetchSignalements: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiCall(`/signalements${query ? `?${query}` : ""}`);
  },

  fetchSignalement: (id: string) => apiCall(`/signalements/${id}`),

  createSignalement: (data: Record<string, any>) =>
    apiCall("/signalements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSignalement: (id: string, data: Record<string, any>) =>
    apiCall(`/signalements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSignalement: (id: string) =>
    apiCall(`/signalements/${id}`, {
      method: "DELETE",
    }),
};
