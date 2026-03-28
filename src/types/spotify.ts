export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtistSimplified {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyArtist extends SpotifyArtistSimplified {
  images: SpotifyImage[];
  genres: string[];
  followers: { total: number };
}

export interface SpotifyAlbumSimplified {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: SpotifyArtistSimplified[];
  release_date: string;
  total_tracks: number;
  uri: string;
  album_type: "album" | "single" | "compilation";
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  track_number: number;
  artists: SpotifyArtistSimplified[];
  album: SpotifyAlbumSimplified;
  is_playable?: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: { display_name: string | null };
  tracks: { total: number };
  uri: string;
}

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  device: SpotifyDevice;
  shuffle_state: boolean;
  repeat_state: "off" | "context" | "track";
}

export interface SpotifyPaginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

export interface SpotifySearchResult {
  tracks?: SpotifyPaginated<SpotifyTrack>;
  albums?: SpotifyPaginated<SpotifyAlbumSimplified>;
  artists?: SpotifyPaginated<SpotifyArtist>;
}

export interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null;
  added_at: string;
}

export interface SpotifyAlbumFull extends SpotifyAlbumSimplified {
  tracks: SpotifyPaginated<SpotifyTrack>;
  label: string;
  copyrights: { text: string; type: string }[];
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
}
