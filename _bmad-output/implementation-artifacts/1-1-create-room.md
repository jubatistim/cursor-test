---
story_id: '1.1'
story_key: '1-1-create-room'
epic: 1
story_number: 1
title: 'Create Room'
status: 'ready-for-dev'
sprint: 1
priority: 1
estimated_hours: 4
created: '2026-04-26'
last_updated: '2026-04-26'
---

# Story 1.1: Create Room

## User Story

**As a** host player,  
**I want** to create a new game room,  
**So that** I can play with my partner.

## Acceptance Criteria

**Given** I am on the home screen  
**When** I click "Create Room"  
**Then** a unique 6-character room code is generated  
**And** I am taken to the room lobby screen

## Technical Requirements

### Room Code Generation
- Generate a random 6-character alphanumeric code (uppercase letters and digits)
- Ensure uniqueness by checking against existing rooms in Supabase
- Format: `ABC123` (e.g., letters and numbers mixed)

### Room Creation
- Create a new room record in Supabase `rooms` table with:
  - `id`: UUID (auto-generated)
  - `code`: 6-character room code (unique)
  - `host_id`: Player identifier (can be session-based for MVP)
  - `status`: 'waiting' (waiting for players to join)
  - `created_at`: timestamp
  - `max_players`: 2 (for MVP)

### Navigation
- After room creation, navigate to `/room/{roomCode}` route
- Display room lobby with:
  - Room code prominently displayed
  - "Copy code" button for sharing
  - "Waiting for players..." message
  - "Start Match" button (disabled until all players join)

## Architecture Compliance

### Tech Stack
- **Frontend**: React (or vanilla JS if simpler for MVP)
- **Backend**: Supabase (PostgreSQL database)
- **Hosting**: Netlify
- **Deployment**: Automatic on push to main branch

### Database Schema
```sql
-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  max_players INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX idx_rooms_code ON rooms(code);
```

### API Integration
- Use Supabase client library for database operations
- Insert room record on "Create Room" click
- Handle errors gracefully (network issues, duplicate codes)

## File Structure Requirements

```
src/
├── components/
│   ├── Home.jsx          # Home screen with Create/Join buttons
│   └── RoomLobby.jsx     # Room lobby display
├── lib/
│   └── supabase.js       # Supabase client configuration
├── utils/
│   └── roomCode.js       # Room code generation utility
└── pages/
    ├── index.jsx         # Home page
    └── room.jsx          # Room page (dynamic route)
```

## Testing Requirements

### Unit Tests
- Room code generation produces 6-character codes
- Room code contains only uppercase letters and digits
- Generated codes are unique (mock Supabase)

### Integration Tests
- Clicking "Create Room" creates a room record in Supabase
- Navigation to room lobby occurs after successful creation
- Error handling for network failures

### Manual Testing
1. Open home screen
2. Click "Create Room"
3. Verify room code is displayed
4. Verify room exists in Supabase (check via Supabase dashboard)
5. Copy room code and share with another player

## Implementation Notes

### MVP Simplification
- No authentication required for MVP (use session-based host_id)
- Simple 2-player limit hardcoded
- No room expiration needed for MVP (can add later)

### Error Handling
- If room creation fails, show user-friendly error message
- Allow retry without leaving home screen
- Log errors to console for debugging

### Security Considerations
- Room codes should be hard to guess (use sufficient entropy)
- Validate room code format on both client and server
- Rate limit room creation to prevent abuse

## Definition of Done

- [ ] Room code generation utility implemented
- [ ] Supabase rooms table created
- [ ] "Create Room" button on home screen
- [ ] Room creation flow works end-to-end
- [ ] Room lobby displays room code
- [ ] Error handling for network failures
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **None** - This is the first story and has no dependencies on other stories
- Supabase project must be set up before implementation

## Next Story

After completing this story, proceed to **Story 1.2: Join Room** which will allow players to enter a room code and join an existing room.