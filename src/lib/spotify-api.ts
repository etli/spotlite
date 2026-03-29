const BASE_URL = "https://api.spotify.com";

export function createSpotifyApi(
  getToken: () => string | null,
  onTokenExpired: () => void,
) {
  async function request<T>(method: string, path: string, params?: Record<string, string>, body?: unknown, signal?: AbortSignal): Promise<T> {
    const token = getToken();
    if (!token) throw new Error("No access token available");

    let url = `${BASE_URL}${path}`;
    if (params) {
      const queryString = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
        .replace(/%2C/gi, ",");
      url += `?${queryString}`;
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const options: RequestInit = { headers, signal };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.method = method;
      options.body = JSON.stringify(body);
    }
    if (method !== "GET" && body === undefined) options.method = method;

    const response = await fetch(url, options);
    if (response.status === 401) { onTokenExpired(); throw new Error("Token expired"); }
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Spotify API ${response.status} ${method} ${url}`, errorBody);
      throw new Error(`Spotify API error: ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  return {
    get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> { return request<T>("GET", path, params, undefined, signal); },
    put<T = void>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> { return request<T>("PUT", path, params, body); },
    post<T>(path: string, body?: unknown): Promise<T> { return request<T>("POST", path, undefined, body); },
    delete<T = void>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> { return request<T>("DELETE", path, params, body); },
  };
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>;
