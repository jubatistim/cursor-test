---
story_id: '5.1'
story_key: '5-1-reveal-correctness'
epic: 5
story_number: 1
title: 'Reveal Correctness'
status: 'ready-for-dev'
sprint: 4
priority: 1
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '4-1-award-points'
---

# Story 5.1: Reveal Correctness

## User Story

**As a** player,  
**I want** to see the correct release year after placing,  
**So that** I can learn and adjust my strategy.

## Acceptance Criteria

**Given** all players have submitted their placements  
**When** the round resolves  
**Then** the correct release year is displayed  
**And** each player's placement is shown as correct or incorrect

## Technical Requirements

### Correctness Reveal UI
- Create a clear visual state distinguishing correct and incorrect placements.
- Display the actual release year on the placed card.
- Show a brief animation highlighting the result (e.g., green pulse for correct, red shake for incorrect).

### Round Resolution Logic
- Detect when all players in the room have confirmed their placements (state synchronization via Supabase).
- Trigger the reveal phase.

## Architecture Compliance

### State Management
- Add a new phase to the local game loop: `round_revealed`.
- Rely on real-time presence or `game_states` table changes to know when both players are ready.

## File Structure Requirements

```
src/
├── components/
│   ├── SongCard.jsx           # Update to support 'revealed' state
│   └── RevealOverlay.jsx      # NEW: Potential overlay or effect for reveal
└── pages/
    └── game.jsx               # Logic tying the round progression
```

## Definition of Done
- [ ] Reveal UI is implemented for both correct and incorrect states
- [ ] Logic correctly detects when all players have submitted
- [ ] Actual release year is visibly rendered
- [ ] Unit tests passing
- [ ] Code reviewed and merged
