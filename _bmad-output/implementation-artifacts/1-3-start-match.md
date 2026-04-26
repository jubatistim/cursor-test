---
story_id: '1.3'
story_key: '1-3-start-match'
epic: 1
story_number: 3
title: 'Start Match'
status: 'ready-for-dev'
sprint: 1
priority: 3
estimated_hours: 4
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '1-1-create-room'
  - '1-2-join-room'
---

# Story 1.3: Start Match

## User Story

**As the** host,  
**I want** to start the match when everyone is ready,  
**So that** we can begin playing.

## Acceptance Criteria

**Given** all players are connected in the room  
**When** I click "Start Match"  
**Then** the game transitions to the first round  
**And** all players see the game begin

## Technical Requirements

### Start Match Button
- Only visible/enabled for the host (player_number = 1)
- Enabled only when room has 2 players (room.player_count = 2)
- Disabled with tooltip "Waiting for second player..." when room is not full

### Match Initialization
- Update room status from 'waiting' to 'playing'
- Create match record in Supabase `matches` table:
  - `id`: UUID (auto-generated)
  - `room_id`: UUID (reference to rooms.id)
  - `started_at`: timestamp
  - `status`: 'active'
  - `current_round`: 1
  - `max_score`: 10 (first to 10 wins)

### Game State Setup
- Initialize game state for both players:
  - Score: 0
  - Correct placements: 0
  - Timeline: empty array
- Store initial state in Supabase `game_states` table

### Navigation
- Host: Navigate to `/game/{roomCode}` (game screen)
- Joiner: Automatically navigate to `/game/{roomCode}` when match starts
- Use Supabase real-time subscription to notify joiner when host starts

### Transition Animation
- Show brief "Starting match..." overlay (1-2 seconds)
- Display room code and player names
- Fade into game screen

## Architecture Compliance

### Database Schema
```sql
-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active', -- active, ended
  current_round INTEGER DEFAULT 1,
  max_score INTEGER DEFAULT 10,
  winner_id UUID REFERENCES players(id)
);

-- Game states table
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  correct_placements INTEGER DEFAULT 0,
  timeline JSONB DEFAULT '[]', -- Array of placed songs with positions
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Update rooms table
ALTER TABLE rooms ADD COLUMN current_match_id UUID REFERENCES matches(id);
```

### API Integration
- Use Supabase client library for database operations
- Update room status and create match record in single transaction
- Use Supabase real-time subscriptions for match start notification

## File Structure Requirements

```
src/
├── components/
│   ├── Home.jsx          # Home screen
│   ├── JoinRoom.jsx      # Join room form
│   ├── RoomLobby.jsx     # Room lobby with Start Match button
│   ├── GameScreen.jsx    # Main game screen
│   └── MatchStarting.jsx # Transition overlay
├── lib/
│   └── supabase.js       # Supabase client configuration
├── utils/
│   ├── roomCode.js       # Room code utility
│   ├── roomService.js    # Room operations
│   └── matchService.js   # Match operations (start, end, etc.)
└── pages/
    ├── index.jsx         # Home page
    ├── room.jsx          # Room page
    └── game.jsx          # Game page
```

## Testing Requirements

### Unit Tests
- Start Match button only enabled when 2 players present
- Start Match button only visible to host
- Match record created with correct data
- Game state initialized correctly for both players

### Integration Tests
- Host clicking "Start Match" updates room status to 'playing'
- Both players navigate to game screen
- Game state is correctly initialized
- Real-time notification works (joiner sees game start)

### Manual Testing
1. Create room (Story 1.1)
2. Join room (Story 1.2)
3. Verify "Start Match" button is enabled
4. Host clicks "Start Match"
5. Verify both players see game screen
6. Verify match record exists in Supabase

## Implementation Notes

### MVP Simplification
- No custom game settings (always first to 10, 2 players)
- No pause/resume functionality
- No spectator mode

### Error Handling
- If match creation fails, show error and stay in lobby
- Allow retry without leaving room
- Handle disconnection during match start

### Real-time Updates
- Use Supabase real-time subscriptions for match start
- Joiner should automatically transition when host starts
- Handle reconnection if player disconnects during transition

## Definition of Done

- [ ] Start Match button implemented (host-only, enabled when full)
- [ ] Match record created in Supabase
- [ ] Game state initialized for both players
- [ ] Navigation to game screen works for both players
- [ ] Transition animation implemented
- [ ] Real-time match start notification working
- [ ] Error handling for match creation failures
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **Story 1.1: Create Room** - Room creation and database schema
- **Story 1.2: Join Room** - Player joining and room population

## Previous Story Learnings

From Story 1.1 (Create Room):
- Use the same Supabase client patterns
- Follow the same error handling approach

From Story 1.2 (Join Room):
- Use the same real-time subscription patterns
- Follow the same navigation patterns

## Next Story

After completing this story, Epic 1 (Room Management) is complete. Proceed to **Story 2.1: Play Song Snippet** which begins Epic 2 (Song Playback) - the core gameplay mechanics.