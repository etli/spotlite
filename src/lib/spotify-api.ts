const BASE_URL = "https://api.spotify.com";

export function createSpotifyApi(
  getToken: () => string | null,
  onTokenExpired: () => void,
) {
  async function request<T>(method: string, path: string, params?: Record<string, string>, body?: unknown): Promise<T> {
    const token = getToken();
    if (!token) throw new Error("No access token available");

    let url = `${BASE_URL}${path}`;
    if (params) url += `?${new URLSearchParams(params).toString()}`;

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const options: RequestInit = { headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.method = method;
      options.body = JSON.stringify(body);
    }
    if (method !== "GET" && body === undefined) options.method = method;

    const response = await fetch(url, options);
    if (response.status === 401) { onTokenExpired(); throw new Error("Token expired"); }
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  return {
    get<T>(path: string, params?: Record<string, string>): Promise<T> { return request<T>("GET", path, params); },
    put<T = void>(path: string, body?: unknown): Promise<T> { return request<T>("PUT", path, undefined, body); },
    post<T>(path: string, body?: unknown): Promise<T> { return request<T>("POST", path, undefined, body); },
  };
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>;
