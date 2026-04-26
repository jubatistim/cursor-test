---
story_id: '6.1'
story_key: '6-1-win-detection'
epic: 6
story_number: 1
title: 'Win Detection'
status: 'ready-for-dev'
sprint: 5
priority: 1
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '4-1-award-points'
---

# Story 6.1: Win Detection

## User Story

**As the** system,  
**I want** to detect when a player reaches 10 correct placements,  
**So that** the match can end.

## Acceptance Criteria

**Given** a round has been resolved  
**When** a player has 10 or more correct placements  
**Then** the match ends  
**And** that player is declared the winner

## Technical Requirements

### Win Condition Logic
- After a round resolves and scores update, check if `player_1_score >= 10` or `player_2_score >= 10`.
- Handle cases where both hit 10 at the same time (e.g., sudden death tie-breaker or declare a draw).

### Match State Update
- If the win condition is met, update the `game_states` table to `finished`.
- Ensure clients listening to Supabase transition immediately out of the standard game loop.

## File Structure Requirements

```
src/
├── utils/
│   ├── winDetectionUtils.js   # NEW: Logic for checking win condition
│   └── gameService.js         # Updates to transition to 'finished'
```

## Definition of Done
- [ ] Win condition accurately checks after every round
- [ ] State updates to 'finished' effectively
- [ ] Ties are properly handled
- [ ] Unit tests passing
- [ ] Code reviewed and merged
