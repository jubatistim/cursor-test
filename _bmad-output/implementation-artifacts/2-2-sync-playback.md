---
story_id: '2.2'
story_key: '2-2-sync-playback'
epic: 2
story_number: 2
title: 'Sync Playback'
status: 'ready-for-dev'
sprint: 2
priority: 2
estimated_hours: 4
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '2-1-play-song-snippet'
---

# Story 2.2: Sync Playback

## User Story

**As a** player,  
**I want** all players to hear the same song at the same time,  
**So that** we're all making decisions based on the same information.

## Acceptance Criteria

**Given** multiple players are in the room  
**When** a song snippet plays  
**Then** all players hear the same song  
**And** playback starts within network tolerance for all players

## Technical Requirements

### Playback Synchronization
- Use Supabase real-time subscriptions to coordinate playback start
- Host triggers "round start" event via Supabase
- All clients receive the event and start playback simultaneously
- Tolerance: playback should start within 500ms for all players

### Round State Management
- Store round state in Supabase `rounds` table
- When host starts round:
  1. Create round record with song_id
  2. Broadcast "round_started" event via Supabase real-time
  3. All clients receive event and begin playback
- Track playback state per player in `player_round_states` table:
  - `id`: UUID
  - `round_id`: UUID (reference to rounds.id)
  - `player_id`: UUID (reference to players.id)
  - `playback_started_at`: timestamp
  - `playback_ended_at`: timestamp
  - `status`: 'listening' | 'completed' | 'failed'

### Latency Compensation
- Include server timestamp in round start event
- Clients calculate offset from server time
- Adjust playback start based on network latency
- Fallback: if sync fails, show "Waiting for other player..." message

### UI Synchronization
- Show synchronized countdown before playback starts
- Display "Starting in 3, 2, 1..." to all players
- All players see same playback progress bar
- Visual indicator if a player's playback is out of sync

### Error Recovery
- If a player misses the sync window (>2 seconds late):
  - Show "Late join" message
  - Allow player to catch up by fast-forwarding
  - Or wait for next round if too far behind
- If playback fails for any player:
  - Show error message
  - Allow manual retry
  - Host can restart the round

## Architecture Compliance

### Database Schema
```sql
-- Player round states table
CREATE TABLE player_round_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  playback_started_at TIMESTAMP WITH TIME ZONE,
  playback_ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'listening', -- listening, completed, failed
  sync_offset_ms INTEGER DEFAULT 0,
  UNIQUE(round_id, player_id)
);

-- Indexes
CREATE INDEX idx_player_round_states_round ON player_round_states(round_id);
CREATE INDEX idx_player_round_states_player ON player_round_states(player_id);
```

### Supabase Real-time Events
```javascript
// Event structure for round start
{
  event: 'round_started',
  round_id: 'uuid',
  song_id: 'uuid',
  server_timestamp: '2026-04-26T01:00:00Z',
  countdown_duration_ms: 3000,
  snippet_start_ms: 15000,
  snippet_duration_ms: 20000
}
```

## File Structure Requirements

```
src/
├── components/
│   ├── GameScreen.jsx         # Main game screen
│   ├── SongPlayer.jsx         # Audio player (from 2.1)
│   ├── SyncIndicator.jsx      # NEW: Sync status display
│   ├── CountdownOverlay.jsx   # NEW: Synchronized countdown
│   └── PlaybackProgress.jsx   # NEW: Progress bar
├── lib/
│   ├── supabase.js            # Supabase client
│   ├── spotify.js             # Spotify API client
│   └── realtime.js            # NEW: Real-time event handling
├── utils/
│   ├── songService.js         # Song operations
│   ├── roundService.js        # Round operations
│   ├── audioPlayer.js         # Audio playback utilities
│   └── syncManager.js         # NEW: Playback synchronization
└── pages/
    └── game.jsx               # Game page
```

## Testing Requirements

### Unit Tests
- Sync manager calculates latency offset correctly
- Playback start time adjusted for network latency
- Round state transitions work correctly

### Integration Tests
- Host starting round triggers playback on all clients
- All players receive the same song_id
- Playback starts within 500ms tolerance
- Late-joining player can catch up

### Manual Testing
1. Start a match with 2 players (different browsers/devices)
2. Start a round
3. Verify both players hear the same song
4. Verify playback starts at approximately the same time
5. Test error scenarios (network lag, playback failure)

## Implementation Notes

### MVP Simplification
- Accept up to 2-second variance for MVP
- No complex latency compensation algorithms
- Simple "start on countdown" approach
- If sync fails, allow manual retry

### Error Handling
- Show clear messages when sync fails
- Allow players to report sync issues
- Host can restart round if needed
- Log sync metrics for debugging

### Network Considerations
- Use Supabase real-time for event distribution
- Fallback to polling if real-time unavailable
- Handle reconnection gracefully
- Queue events if player temporarily disconnected

## Definition of Done

- [ ] Supabase real-time subscription for round events
- [ ] Synchronized countdown before playback
- [ ] All players start playback within tolerance
- [ ] Sync status indicator visible to all players
- [ ] Error handling for sync failures
- [ ] Late-join recovery mechanism
- [ ] Unit tests passing
- [ ] Manual testing with 2 players completed
- [ ] Code reviewed and merged

## Dependencies

- **Story 2.1: Play Song Snippet** - Song playback must be working
- Supabase real-time enabled on the project

## Previous Story Learnings

From Story 2.1 (Play Song Snippet):
- Use the same Spotify integration patterns
- Follow the same audio playback approach
- Maintain consistent UI patterns

## Next Story

After completing this story, Epic 2 (Song Playback) is complete. Proceed to **Story 3.1: Drag to Place** which begins Epic 3 (Timeline Placement) - where players place songs on their timeline.