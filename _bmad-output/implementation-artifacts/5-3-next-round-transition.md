---
story_id: '5.3'
story_key: '5-3-next-round-transition'
epic: 5
story_number: 3
title: 'Next Round Transition'
status: 'ready-for-dev'
sprint: 4
priority: 3
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '5-2-lock-correct-placements'
---

# Story 5.3: Next Round Transition

## User Story

**As a** player,  
**I want** a brief transition before the next song,  
**So that** I can prepare for the next round.

## Acceptance Criteria

**Given** a round has been resolved  
**When** 3 seconds have passed  
**Then** the next song snippet begins  
**And** the new round starts

## Technical Requirements

### Timer & Transition Logic
- Start a 3-second countdown automatically after the reveal phase is completed and cards are locked.
- Provide a small visual indicator (like a shrinking bar or a numeric countdown).
- After the timeout, fetch the next song from the catalog and transition the local state to `playing_snippet`.

## File Structure Requirements

```
src/
├── components/
│   └── NextRoundTimer.jsx     # NEW: 3-second visual countdown
└── pages/
    └── game.jsx               # Update loop state
```

## Definition of Done
- [ ] 3-second timer accurately fires after reveal
- [ ] Visual indicator communicates the pause clearly
- [ ] State successfully loops back to starting a new round
- [ ] Code reviewed and merged
