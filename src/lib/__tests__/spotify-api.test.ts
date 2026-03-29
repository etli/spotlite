import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpotifyApi } from "../spotify-api";

describe("createSpotifyApi", () => {
  let api: ReturnType<typeof createSpotifyApi>;
  let getToken: () => string | null;
  let onTokenExpired: () => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    getToken = vi.fn().mockReturnValue("valid_token") as () => string | null;
    onTokenExpired = vi.fn();
    api = createSpotifyApi(getToken, onTokenExpired);
  });

  it("sends GET requests with Authorization header", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ items: [] })) });
    await api.get("/v1/me/playlists");
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: "Bearer valid_token" },
    });
  });

  it("sends PUT requests with JSON body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({})) });
    await api.put("/v1/me/player", { device_ids: ["abc"] });
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: { Authorization: "Bearer valid_token", "Content-Type": "application/json" },
      body: JSON.stringify({ device_ids: ["abc"] }),
    });
  });

  it("calls onTokenExpired on 401 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(api.get("/v1/me")).rejects.toThrow();
    expect(onTokenExpired).toHaveBeenCalled();
  });

  it("appends query params to GET requests", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({})) });
    await api.get("/v1/search", { q: "test", type: "track" });
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/search?q=test&type=track", expect.any(Object));
  });

  it("sends DELETE requests with query params", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    await api.delete("/v1/me/library", undefined, { uris: "spotify:album:abc" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/library?uris=spotify%3Aalbum%3Aabc",
      { method: "DELETE", headers: { Authorization: "Bearer valid_token" } },
    );
  });
});
