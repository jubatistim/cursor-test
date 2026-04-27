## Deferred from: code review of 1-1-create-room (2026-04-26)
- Generic Error Swallowing (Code Collision Unhandled) [src/components/Home.jsx]

## Deferred from: code review of 2-2-sync-playback (2026-04-26)
- Missing indexing on player_round_states table
- No authentication on Supabase channel subscriptions
- Audio element cleanup in component unmount
- SessionStorage quota handling
- No rate limiting on round creation

## Deferred from: code review of 2-1-play-song-snippet (2026-04-26)
- redundancy: CHECK constraint + trigger for snippet_duration
- Missing indexes on songs table
- Audio element cleanup across components
- SessionStorage quota handling

## Deferred from: code review of 6-2-end-screen (2026-04-27)
- Missing accessibility attributes on EndScreen interactive elements
- Hardcoded magic numbers in Confetti component (particleCount=150, velocities, 5000ms duration)
- Large inline CSS in EndScreen.jsx reduces maintainability
- No type definitions (PropTypes/TypeScript) on new components
- No canvas DPI scaling for high-resolution displays

