---
story_id: '5.4'
story_key: '5-4-timeout-handling'
epic: 5
story_number: 4
title: 'Timeout Handling'
status: 'ready-for-dev'
sprint: 4
priority: 4
estimated_hours: 4
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '5-3-next-round-transition'
---

# Story 5.4: Timeout Handling

## User Story

**As a** player,  
**I want** the game to handle stalled players,  
**So that** matches don't get stuck.

## Acceptance Criteria

**Given** a player hasn't placed within 60 seconds  
**When** the timeout expires  
**Then** that player receives 0 points for this round  
**And** the round proceeds to resolution

## Technical Requirements

### Turn Timer
- A global 60-second timer begins at the start of the `playing_snippet` phase.
- Synchronize the timer start between both clients via the backend so there's no unfair advantage.

### Timeout Forfeit logic
- If the timer hits zero and a player has not locked their placement, automatically submit a 'forfeit' or 'incorrect' payload to the backend.
- Force the player's state to `waiting_for_opponent` or proceed straight to `round_revealed` if both are done.

## File Structure Requirements

```
src/
├── components/
│   └── TurnTimer.jsx          # NEW: 60-second progress bar/timer
└── utils/
    └── timerUtils.js          # Synchronized timeout handling
```

## Definition of Done
- [ ] 60-second timer displays and works
- [ ] Player forfeits round with 0 points if timer expires
- [ ] Game seamlessly transitions to reveal without getting stuck
- [ ] Edge cases (disconnects during timer) handled gracefully
- [ ] Code reviewed and merged
