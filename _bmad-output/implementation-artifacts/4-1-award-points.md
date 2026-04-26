---
story_id: '4.1'
story_key: '4-1-award-points'
epic: 4
story_number: 1
title: 'Award Points'
status: 'ready-for-dev'
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

- [ ] Point calculation logic is implemented and accurate
- [ ] Backend updates the score when placement is verified
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged
