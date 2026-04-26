---
story_id: '2.1'
story_key: '2-1-play-song-snippet'
epic: 2
story_number: 1
title: 'Play Song Snippet'
status: 'ready-for-dev'
sprint: 2
priority: 1
estimated_hours: 6
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '1-1-create-room'
  - '1-2-join-room'
  - '1-3-start-match'
---

# Story 2.1: Play Song Snippet

## User Story

**As a** player,  
**I want** to hear a song snippet,  
**So that** I can identify when it was released.

## Acceptance Criteria

**Given** a new round has started  
**When** the round begins  
**Then** a 15-30 second song snippet plays  
**And** I can hear it clearly

## Technical Requirements

### Song Catalog Management
- Store song metadata in Supabase `songs` table:
  - `id`: UUID (primary key)
  - `title`: VARCHAR(255)
  - `artist`: VARCHAR(255)
  - `release_year`: INTEGER
  - `spotify_id`: VARCHAR(255) (Spotify track ID)
  - `snippet_start`: INTEGER (seconds into track to start snippet)
  - `snippet_duration`: INTEGER DEFAULT 20 (seconds, 15-30 range)
  - `genre`: VARCHAR(100) (optional, for filtering)
  - `created_at`: timestamp

### Round Song Selection
- When a round starts, select a random song from the catalog
- Ensure song hasn't been used in the current match
- Store selected song in `rounds` table:
  - `id`: UUID (primary key)
  - `match_id`: UUID (reference to matches.id)
  - `round_number`: INTEGER
  - `song_id`: UUID (reference to songs.id)
  - `started_at`: timestamp
  - `status`: 'active' | 'completed'

### Audio Playback
- Use Spotify Web Playback SDK or Spotify API for audio playback
- Play 15-30 second snippet starting from `snippet_start` position
- Handle playback errors gracefully (song unavailable, API limits)
- Auto-stop after snippet duration expires

### UI Requirements
- Display current song info (without revealing year):
  - Song title (optional - can hide for harder difficulty)
  - Artist name (optional - can hide for harder difficulty)
  - Round number
  - Countdown timer showing remaining listen time
- "Play Again" button to replay the snippet (limit to 2-3 replays)
- Visual indicator that audio is playing

## Architecture Compliance

### Database Schema
```sql
-- Songs table
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  release_year INTEGER NOT NULL,
  spotify_id VARCHAR(255),
  snippet_start INTEGER NOT NULL DEFAULT 0,
  snippet_duration INTEGER NOT NULL DEFAULT 20,
  genre VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  song_id UUID NOT NULL REFERENCES songs(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active',
  UNIQUE(match_id, round_number)
);

-- Track used songs per match
CREATE TABLE match_used_songs (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (match_id, song_id)
);

-- Indexes
CREATE INDEX idx_songs_release_year ON songs(release_year);
CREATE INDEX idx_rounds_match ON rounds(match_id);
```

### Spotify Integration
- Use Spotify Web API for track metadata
- Use Spotify Web Playback SDK for audio playback (requires premium account)
- Alternative: Use Spotify's 30-second preview URLs if available
- Handle API rate limits and authentication

## File Structure Requirements

```
src/
├── components/
│   ├── GameScreen.jsx         # Main game screen
│   ├── SongPlayer.jsx         # Audio player component
│   ├── RoundInfo.jsx          # Round display
│   └── ReplayButton.jsx       # Replay snippet button
├── lib/
│   ├── supabase.js            # Supabase client
│   └── spotify.js             # Spotify API client
├── utils/
│   ├── songService.js         # Song operations
│   ├── roundService.js        # Round operations
│   └── audioPlayer.js         # Audio playback utilities
└── pages/
    └── game.jsx               # Game page
```

## Testing Requirements

### Unit Tests
- Random song selection excludes previously used songs
- Snippet duration is within 15-30 second range
- Round record created correctly in Supabase

### Integration Tests
- Clicking "Start Round" triggers song playback
- Audio plays for correct duration
- "Play Again" button replays the snippet
- Replay limit enforced (2-3 replays max)

### Manual Testing
1. Start a match (Stories 1.1-1.3)
2. Verify song snippet plays automatically
3. Verify snippet is 15-30 seconds
4. Test "Play Again" button
5. Verify round record in Supabase

## Implementation Notes

### MVP Simplification
- Start with a small curated song list (~50 songs) for testing
- Can expand to ~500 songs later
- Use Spotify preview URLs (30-second clips) for MVP
- No custom audio hosting needed initially

### Error Handling
- If Spotify API fails, show "Song unavailable, skipping..."
- Auto-advance to next song after brief delay
- Log errors for debugging

### Audio Considerations
- Ensure audio works on both desktop and mobile
- Handle browser autoplay policies (may need user interaction first)
- Provide visual feedback when audio can't play

## Definition of Done

- [ ] Songs table created with sample data (~50 songs)
- [ ] Round song selection logic implemented
- [ ] Spotify integration working (or fallback audio)
- [ ] Audio playback for 15-30 second snippets
- [ ] "Play Again" button with replay limit
- [ ] Round record created in Supabase
- [ ] UI shows round info and playback status
- [ ] Error handling for audio failures
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **Stories 1.1-1.3** - Room management must be complete for game to be active
- Spotify Developer account and API credentials
- Supabase project configured

## Previous Story Learnings

From Epic 1 (Room Management):
- Use the same Supabase client patterns
- Follow the same error handling approach
- Maintain consistent UI patterns from lobby screens

## Next Story

After completing this story, proceed to **Story 2.2: Sync Playback** which ensures all players hear the same song at the same time.