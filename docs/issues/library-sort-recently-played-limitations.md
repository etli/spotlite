# Library sort: recently-played signal limitations

**Date:** 2026-03-29

## What's implemented

All three library tabs (Playlists, Albums, Artists) sort by most recently played, sourced from `GET /v1/me/player/recently-played?limit=50`. The sort is working correctly — it does reorder items based on that data.

## Why specific playlists may not bubble up

The Spotify recently-played API has constraints that limit the sort's effectiveness:

### 1. Context is often null
The `context` field on a recently-played item (which tells us *which playlist* a track was played from) is only set when the track was started from within a playlist or album. It is `null` when:
- A track is played from search results
- A track is added to the queue and played from there
- A track is played from the SDK without a context URI

In practice, a large portion of the 50 returned items have `context: null`, so playlist sorting signal is sparse.

### 2. 50-item window fills quickly
The API caps recently-played at 50 items. If a user plays KPDH (or any playlist), then immediately plays 50+ tracks without a playlist context (e.g. queue, search), KPDH is completely displaced from the window. There is no cursor-based pagination that would help here — the endpoint simply doesn't return more than 50 items.

### 3. Indexing delay
Spotify indexes plays into the recently-played API with a delay of roughly 5–10 minutes. The recently-played fetch runs once when `LibraryView` mounts (every time you navigate to `/`), so the sort always reflects Spotify's view of your history at the moment you arrive at the library. If you play a playlist and immediately navigate back to the library, those plays won't be in the sort yet — wait 5–10 minutes and reload the library for them to appear.

## Possible improvements

- **Use the Spotify playback history more aggressively**: `GET /v1/me/player/recently-played` supports a `before` cursor, but even with pagination the API limits total history. A Spotify Extended Access (streamed) feature might help but is not available to all apps.
- **Track play events locally**: Intercept `player_state_changed` events from the Web Playback SDK and maintain a local play history keyed by playlist/album context URI. This would be accurate and real-time, with no API delay or 50-item cap.
- **Ask Spotify for more context**: When calling `PUT /v1/me/player/play`, always pass `context_uri` (already done in `PlaylistDetailView` and `AlbumDetailView`). This ensures SDK-initiated plays are recorded with context in Spotify's history.

## Current state

The sort code in `src/views/LibraryView.tsx` and `src/lib/recently-played.ts` is correct. The limitation is entirely in the upstream data quality from the Spotify API.
