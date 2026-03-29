import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  country: string;
  userId: string | null;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  setCountry: (country: string) => void;
  setUserId: (userId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  country: "US",
  userId: null,

  setTokens: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    set({ accessToken, refreshToken, expiresAt });
    localStorage.setItem("spotlite_access_token", accessToken);
    localStorage.setItem("spotlite_refresh_token", refreshToken);
    localStorage.setItem("spotlite_expires_at", expiresAt.toString());
  },

  setCountry: (country) => set({ country }),

  setUserId: (userId) => {
    set({ userId });
    localStorage.setItem("spotlite_user_id", userId);
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null, userId: null });
    localStorage.removeItem("spotlite_access_token");
    localStorage.removeItem("spotlite_refresh_token");
    localStorage.removeItem("spotlite_expires_at");
    localStorage.removeItem("spotlite_code_verifier");
    localStorage.removeItem("spotlite_user_id");
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
    const userId = localStorage.getItem("spotlite_user_id");
    if (accessToken && refreshToken && expiresAtStr) {
      set({ accessToken, refreshToken, expiresAt: parseInt(expiresAtStr, 10), userId });
    }
  },
}));
