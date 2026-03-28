import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../auth-store";

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, expiresAt: null });
    localStorage.clear();
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it("setTokens stores tokens and persists to localStorage", () => {
    useAuthStore.getState().setTokens("access_123", "refresh_456", 3600);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access_123");
    expect(state.refreshToken).toBe("refresh_456");
    expect(state.expiresAt).toBeGreaterThan(Date.now());
    expect(state.isAuthenticated()).toBe(true);
    expect(localStorage.getItem("spotlite_access_token")).toBe("access_123");
  });

  it("logout clears everything", () => {
    useAuthStore.getState().setTokens("access_123", "refresh_456", 3600);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
    expect(localStorage.getItem("spotlite_access_token")).toBeNull();
  });

  it("isAuthenticated returns false when token is expired", () => {
    useAuthStore.setState({ accessToken: "expired", refreshToken: "refresh", expiresAt: Date.now() - 1000 });
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});
