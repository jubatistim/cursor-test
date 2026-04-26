---
story_id: '6.3'
story_key: '6-3-rematch'
epic: 6
story_number: 3
title: 'Rematch'
status: 'ready-for-dev'
sprint: 5
priority: 3
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '6-2-end-screen'
---

# Story 6.3: Rematch

## User Story

**As a** player,  
**I want** to start a new match in the same room,  
**So that** we can play again quickly.

## Acceptance Criteria

**Given** the match has ended  
**When** I click "Play Again"  
**Then** a new match starts in the same room  
**And** scores are reset to 0

## Technical Requirements

### Play Again Button
- Place prominently on the `EndScreen` component.
- When clicked, update the backend state to signal readiness for a new game.

### Room Reset Logic
- Reset `player_1_score` and `player_2_score` to 0.
- Clear the timelines for both players.
- Change game state back to `playing_snippet`.
- Ensure new tracks are loaded from the Spotify catalog and don't reuse tracks from the previous match immediately.

## File Structure Requirements

```
src/
├── components/
│   └── EndScreen.jsx          # Add Play Again button
└── utils/
    └── gameService.js         # Add resetGame logic
```

## Definition of Done
- [ ] Play Again button works and is visible
- [ ] Clicking play again restarts the game loop
- [ ] Scores and timelines are wiped
- [ ] Unit tests passing
- [ ] Code reviewed and merged
