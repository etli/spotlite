export {};

declare global {
  interface SpotifyPlayer {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: "ready", cb: (data: { device_id: string }) => void): void;
    addListener(event: "not_ready", cb: (data: { device_id: string }) => void): void;
    addListener(event: "player_state_changed", cb: (state: WebPlaybackState | null) => void): void;
    addListener(event: "initialization_error", cb: (data: { message: string }) => void): void;
    addListener(event: "authentication_error", cb: (data: { message: string }) => void): void;
    addListener(event: "account_error", cb: (data: { message: string }) => void): void;
    removeListener(event: string): void;
    togglePlay(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getCurrentState(): Promise<WebPlaybackState | null>;
  }

  interface WebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        name: string;
        uri: string;
        duration_ms: number;
        artists: { name: string; uri: string }[];
        album: { name: string; uri: string; images: { url: string; height: number; width: number }[] };
      };
    };
    shuffle: boolean;
    repeat_mode: 0 | 1 | 2;
  }

  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

