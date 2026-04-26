---
story_id: '3.3'
story_key: '3-3-confirm-placement'
epic: 3
story_number: 3
title: 'Confirm Placement'
status: 'ready-for-dev'
sprint: 3
priority: 3
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '3-1-drag-to-place'
  - '3-2-insert-at-position'
---

# Story 3.3: Confirm Placement

## User Story

**As a** player,  
**I want** to confirm my placement,  
**So that** my answer is locked in.

## Acceptance Criteria

**Given** I have positioned a song on my timeline  
**When** I click/tap to confirm  
**Then** my placement is submitted  
**And** I see a "waiting for other player" state

## Technical Requirements

### Confirmation UI
- Show a "Confirm Placement" button after the user places a song card.
- Button should be clearly visible and accessible on both desktop and mobile.
- "Waiting for other player" UI overlay or state indicator when placement is confirmed but waiting for opponent.

### State Persistence
- Save the confirmed placement to the backend (Supabase `game_states` table).
- Wait for opponent's state to also reflect confirmed.

### Edge Cases
- Player changes mind: Allow picking up the card again before confirming.
- Timeout handling: If timer runs out before confirm, auto-submit or count as failed.

## Architecture Compliance

### Database Interaction
- Update `game_states` row for the match to record this user's placed choice.

### State Management
- Transition local state from `placing` to `waiting_for_opponent`.
- Subscribe to real-time updates for opponent's status to progress to next round.

## File Structure Requirements

```
src/
├── components/
│   ├── ConfirmButton.jsx      # NEW: Button to lock in placement
│   ├── WaitingOverlay.jsx     # NEW: Waiting state UI
│   └── Timeline.jsx           # Existing timeline component
├── utils/
│   └── gameService.js         # Operations to save placement
└── pages/
    └── game.jsx               # Main game page
```

## Testing Requirements

### Unit Tests
- Clicking confirm updates local state.
- Waiting state is shown when confirmed.

### Integration Tests
- Verify placement is saved to Supabase.
- Ensure the game correctly waits for the other player.

## Definition of Done

- [ ] Confirm button displays after valid placement
- [ ] Clicking confirm locks the card and shows waiting state
- [ ] Placement is persisted to Supabase
- [ ] Player can modify placement before confirming
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged
