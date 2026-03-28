import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  SCOPES,
} from "../spotify-auth";

describe("generateCodeVerifier", () => {
  it("returns a string of length 128", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(128);
  });

  it("contains only URL-safe characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a base64url-encoded SHA-256 hash", async () => {
    const challenge = await generateCodeChallenge("test_verifier");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("returns consistent output for same input", async () => {
    const a = await generateCodeChallenge("same_input");
    const b = await generateCodeChallenge("same_input");
    expect(a).toBe(b);
  });
});

describe("buildAuthUrl", () => {
  it("builds a valid Spotify authorize URL", () => {
    const url = buildAuthUrl("test_challenge", "test_client_id", "http://localhost:5173/callback");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.spotify.com");
    expect(parsed.pathname).toBe("/authorize");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test_client_id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:5173/callback");
    expect(parsed.searchParams.get("code_challenge")).toBe("test_challenge");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("scope")).toBe(SCOPES.join(" "));
  });
});

describe("exchangeCode", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("sends correct POST body and returns tokens", async () => {
    const mockResponse = { access_token: "access_123", refresh_token: "refresh_456", expires_in: 3600 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) });

    const result = await exchangeCode("auth_code", "verifier_123", "client_id", "http://localhost:5173/callback");

    expect(fetch).toHaveBeenCalledWith("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: expect.any(URLSearchParams),
    });
    const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth_code");
    expect(body.get("code_verifier")).toBe("verifier_123");
    expect(result).toEqual(mockResponse);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("sends correct refresh request", async () => {
    const mockResponse = { access_token: "new_access", refresh_token: "new_refresh", expires_in: 3600 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) });

    const result = await refreshAccessToken("old_refresh", "client_id");

    const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old_refresh");
    expect(result).toEqual(mockResponse);
  });
});
