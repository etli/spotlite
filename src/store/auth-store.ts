import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  country: string;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  setCountry: (country: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  country: "US",

  setTokens: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    set({ accessToken, refreshToken, expiresAt });
    localStorage.setItem("spotlite_access_token", accessToken);
    localStorage.setItem("spotlite_refresh_token", refreshToken);
    localStorage.setItem("spotlite_expires_at", expiresAt.toString());
  },

  setCountry: (country) => set({ country }),

  logout: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null });
    localStorage.removeItem("spotlite_access_token");
    localStorage.removeItem("spotlite_refresh_token");
    localStorage.removeItem("spotlite_expires_at");
    localStorage.removeItem("spotlite_code_verifier");
  },

  isAuthenticated: () => {
    const { accessToken, expiresAt } = get();
    if (!accessToken || !expiresAt) return false;
    return Date.now() < expiresAt;
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem("spotlite_access_token");
    const refreshToken = localStorage.getItem("spotlite_refresh_token");
    const expiresAtStr = localStorage.getItem("spotlite_expires_at");
    if (accessToken && refreshToken && expiresAtStr) {
      set({ accessToken, refreshToken, expiresAt: parseInt(expiresAtStr, 10) });
    }
  },
}));
