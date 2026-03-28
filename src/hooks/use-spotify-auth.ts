import { useEffect, useCallback } from "react";
import { useAuthStore } from "../store/auth-store";
import {
  generateCodeVerifier, generateCodeChallenge, buildAuthUrl, exchangeCode, refreshAccessToken,
} from "../lib/spotify-auth";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

export function useSpotifyAuth() {
  const { accessToken, refreshToken, expiresAt, setTokens, logout, isAuthenticated, loadFromStorage } = useAuthStore();

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;
    const verifier = localStorage.getItem("spotlite_code_verifier");
    if (!verifier) return;
    window.history.replaceState({}, "", "/");
    exchangeCode(code, verifier, CLIENT_ID, REDIRECT_URI).then((tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      localStorage.removeItem("spotlite_code_verifier");
    });
  }, [setTokens]);

  useEffect(() => {
    if (!refreshToken || !expiresAt) return;
    const refreshIn = expiresAt - Date.now() - 60_000;
    if (refreshIn <= 0) {
      refreshAccessToken(refreshToken, CLIENT_ID).then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      }).catch(() => logout());
      return;
    }
    const timer = setTimeout(() => {
      refreshAccessToken(refreshToken, CLIENT_ID).then((tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      }).catch(() => logout());
    }, refreshIn);
    return () => clearTimeout(timer);
  }, [refreshToken, expiresAt, setTokens, logout]);

  const login = useCallback(async () => {
    const verifier = generateCodeVerifier();
    localStorage.setItem("spotlite_code_verifier", verifier);
    const challenge = await generateCodeChallenge(verifier);
    const url = buildAuthUrl(challenge, CLIENT_ID, REDIRECT_URI);
    window.location.href = url;
  }, []);

  return { isAuthenticated: isAuthenticated(), accessToken, login, logout };
}
