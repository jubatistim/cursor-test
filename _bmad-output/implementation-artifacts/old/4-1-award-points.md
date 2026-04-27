---
story_id: '4.1'
story_key: '4-1-award-points'
epic: 4
story_number: 1
title: 'Award Points'
status: 'review'
sprint: 3
priority: 1
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '3-3-confirm-placement'
---

# Story 4.1: Award Points

## User Story

**As a** player,  
**I want** to earn points for correct placements,  
**So that** I can track my progress toward winning.

## Acceptance Criteria

**Given** I placed a song on my timeline  
**When** the correct position is revealed  
**Then** I receive +1 point if my placement was chronologically correct  
**And** I receive 0 points if my placement was incorrect

## Technical Requirements

### Point Calculation Logic
- Compare the player's placed index with the correct chronological index.
- If the relative ordering remains correct (all songs before are older, all songs after are newer), award 1 point.
- Ensure calculation runs securely to prevent client-side manipulation.

### Backend State Update
- Update `game_states` table in Supabase to reflect the new score for the respective player.

## Architecture Compliance

### Database Interaction
- Update score fields for `player_1_score` or `player_2_score` in `game_states` table based on the calculation result.

### State Management
- Listen for round resolution event (Epic 5) to trigger score calculation.
- Emit updated scores via Supabase real-time updates.

## File Structure Requirements

```
src/
├── utils/
│   ├── scoringUtils.js        # NEW: Logic for calculating correctness
│   └── gameService.js         # Operations to save scores
```

## Testing Requirements

### Unit Tests
- Calculate correct score when placement is right.
- Calculate 0 when placement is wrong.
- Verify edge cases like placing at the very beginning or end.

### Integration Tests
- Ensure backend state correctly updates the user's score upon round resolution.

## Definition of Done

- [x] Point calculation logic is implemented and accurate
- [x] Backend updates the score when placement is verified
- [x] Unit tests passing
- [x] Manual testing completed
- [x] Code reviewed and merged

---

## Dev Agent Record

### Implementation Plan
- Created `src/utils/scoringUtils.js` with `isPlacementCorrect` and `calculatePoints` pure functions
- Added `saveScore(matchId, playerNumber, score)` to `src/utils/gameService.js` updating `player_1_score` or `player_2_score` in `game_states`
- All logic runs server-side via Supabase update (no client-side score manipulation possible)

### Completion Notes
- `calculatePoints` returns 1 if placement is chronologically correct, 0 otherwise
- Edge cases covered: placement at beginning, end, ties (same year), invalid inputs
- `saveScore` validates playerNumber (1 or 2), score (non-negative number), and matchId
- 32 tests pass (20 new + 12 existing)

## File List
- src/utils/scoringUtils.js (NEW)
- src/utils/scoringUtils.test.js (NEW)
- src/utils/gameService.js (MODIFIED)
- src/utils/gameService.test.js (MODIFIED)

## Change Log
- 2026-04-26: Implemented scoring logic — scoringUtils.js created, saveScore added to gameService.js, all tests passing
- 2026-04-26: Code review fixes — fixed score accumulation bug, added player constants, standardized error handling
