---
story_id: '6.2'
story_key: '6-2-end-screen'
epic: 6
story_number: 2
title: 'End Screen'
status: 'ready-for-dev'
sprint: 5
priority: 2
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '6-1-win-detection'
---

# Story 6.2: End Screen

## User Story

**As a** player,  
**I want** to see the final results,  
**So that** I know who won and can celebrate.

## Acceptance Criteria

**Given** a player has reached 10 correct placements  
**When** the match ends  
**Then** a celebration screen is shown  
**And** final scores for both players are displayed

## Technical Requirements

### End Screen Component
- Dedicated view/component shown when match status is `finished`.
- Distinct styling for the Winner vs the Loser (e.g., confetti for winner, 'Good Game' for loser).
- Prominently display final scores.

### Routing / State Flow
- App transitions seamlessly from the main game timeline view into the End Screen view without full page reloads.

## File Structure Requirements

```
src/
├── components/
│   ├── EndScreen.jsx          # NEW: Match over view
│   └── Confetti.jsx           # NEW: Optional celebration effect
└── pages/
    └── game.jsx               # Conditional rendering for 'finished' state
```

## Definition of Done
- [ ] End Screen renders properly when match ends
- [ ] Winner and Loser are clearly identified
- [ ] Confetti or celebration effects fire for the winner
- [ ] Unit tests passing
- [ ] Code reviewed and merged
