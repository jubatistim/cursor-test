---
story_id: '1.2'
story_key: '1-2-join-room'
epic: 1
story_number: 2
title: 'Join Room'
status: 'ready-for-dev'
sprint: 1
priority: 2
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '1-1-create-room'
---

# Story 1.2: Join Room

## User Story

**As a** joining player,  
**I want** to enter a room code,  
**So that** I can join my partner's game.

## Acceptance Criteria

**Given** I am on the home screen  
**When** I enter a valid 6-character room code and click "Join"  
**Then** I am connected to that room's lobby  
**And** the host sees me as a connected player

## Technical Requirements

### Room Code Input
- Input field that accepts 6-character alphanumeric codes
- Auto-uppercase input as user types
- Validation: must be exactly 6 characters (A-Z, 0-9)
- Show validation error if format is invalid

### Room Lookup
- Query Supabase `rooms` table by code
- Handle cases:
  - Room found and status is 'waiting' → join successfully
  - Room not found → show "Room not found" error
  - Room full (2 players) → show "Room is full" error
  - Room already started → show "Game already started" error

### Player Registration
- Add player to `players` table in Supabase:
  - `id`: UUID (auto-generated)
  - `room_id`: UUID (reference to rooms.id)
  - `player_number`: 1 (host) or 2 (joiner)
  - `joined_at`: timestamp
- Update room status if room is now full (2 players)

### Navigation
- After successful join, navigate to `/room/{roomCode}` route
- Display room lobby with:
  - Room code displayed
  - "Waiting for host to start..." message
  - List of connected players

## Architecture Compliance

### Database Schema
```sql
-- Players table (add to existing schema from Story 1.1)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_number)
);

-- Update rooms table to track player count
ALTER TABLE rooms ADD COLUMN player_count INTEGER DEFAULT 0;

-- Create index for room lookups by code
CREATE INDEX idx_rooms_code ON rooms(code);
```

### API Integration
- Use Supabase client library for database operations
- Query room by code, then insert player record
- Use Supabase real-time subscriptions to notify host of new player

## File Structure Requirements

```
src/
├── components/
│   ├── Home.jsx          # Home screen with Create/Join buttons
│   ├── JoinRoom.jsx      # Join room form component
│   └── RoomLobby.jsx     # Room lobby display
├── lib/
│   └── supabase.js       # Supabase client configuration
├── utils/
│   ├── roomCode.js       # Room code generation/validation utility
│   └── roomService.js    # Room operations (create, join, etc.)
└── pages/
    ├── index.jsx         # Home page
    └── room.jsx          # Room page (dynamic route)
```

## Testing Requirements

### Unit Tests
- Room code validation accepts valid 6-character codes
- Room code validation rejects invalid codes (too short, too long, special chars)
- Auto-uppercase conversion works correctly

### Integration Tests
- Entering valid room code and clicking "Join" navigates to room lobby
- Entering invalid room code shows error message
- Entering non-existent room code shows "Room not found" error
- Entering full room code shows "Room is full" error

### Manual Testing
1. Open home screen
2. Enter a valid room code from Story 1.1
3. Click "Join"
4. Verify navigation to room lobby
5. Verify host sees new player connected (test with two browsers)

## Implementation Notes

### MVP Simplification
- No authentication required (use session-based player identification)
- Simple 2-player limit enforced
- No password protection for rooms

### Error Handling
- Show clear, user-friendly error messages
- Allow retry without leaving home screen
- Log errors to console for debugging

### Real-time Updates
- Use Supabase real-time subscriptions for player count updates
- Host should see "Player 2 joined" notification
- Joiner should see "Connected to room" confirmation

## Definition of Done

- [ ] Join room form implemented with validation
- [ ] Room lookup by code works
- [ ] Player record created in Supabase
- [ ] Navigation to room lobby works
- [ ] Error handling for all edge cases
- [ ] Real-time updates working (host sees joiner)
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **Story 1.1: Create Room** - Room creation and database schema must be complete
- Supabase project must be set up with rooms and players tables

## Previous Story Learnings

From Story 1.1 (Create Room):
- Use the same room code generation utility for validation
- Follow the same Supabase client patterns
- Use the same error handling approach

## Next Story

After completing this story, proceed to **Story 1.3: Start Match** which will allow the host to start the game when all players are ready.