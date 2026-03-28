import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSpotifyApi } from "../spotify-api";

describe("createSpotifyApi", () => {
  let api: ReturnType<typeof createSpotifyApi>;
  let getToken: ReturnType<typeof vi.fn>;
  let onTokenExpired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    getToken = vi.fn().mockReturnValue("valid_token");
    onTokenExpired = vi.fn();
    api = createSpotifyApi(getToken, onTokenExpired);
  });

  it("sends GET requests with Authorization header", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) });
    await api.get("/v1/me/playlists");
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: "Bearer valid_token" },
    });
  });

  it("sends PUT requests with JSON body", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await api.put("/v1/me/player", { device_ids: ["abc"] });
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: { Authorization: "Bearer valid_token", "Content-Type": "application/json" },
      body: JSON.stringify({ device_ids: ["abc"] }),
    });
  });

  it("calls onTokenExpired on 401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(api.get("/v1/me")).rejects.toThrow();
    expect(onTokenExpired).toHaveBeenCalled();
  });

  it("appends query params to GET requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await api.get("/v1/search", { q: "test", type: "track" });
    expect(fetch).toHaveBeenCalledWith("https://api.spotify.com/v1/search?q=test&type=track", expect.any(Object));
  });
});
