---
story_id: '5.2'
story_key: '5-2-lock-correct-placements'
epic: 5
story_number: 2
title: 'Lock Correct Placements'
status: 'ready-for-dev'
sprint: 4
priority: 2
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '5-1-reveal-correctness'
---

# Story 5.2: Lock Correct Placements

## User Story

**As a** player,  
**I want** my correct placements to stay on my timeline,  
**So that** I can see my progress.

## Acceptance Criteria

**Given** I placed a song correctly  
**When** the round resolves  
**Then** the song is locked into my timeline  
**And** it remains visible for the rest of the match

## Technical Requirements

### Timeline Persistence Logic
- At the end of the reveal phase, if the placement is correct, append the song data to the persistent local timeline array.
- If incorrect, the song card is discarded/removed from the timeline.
- Timeline items must be immutable for the rest of the match.

### Storage
- The timeline must persist through the `game_states` table to allow for reconnection and syncing.

## File Structure Requirements

```
src/
├── components/
│   ├── Timeline.jsx           # Render locked cards as un-draggable
└── utils/
    └── timelineUtils.js       # Logic to merge new locked cards
```

## Tasks/Subtasks

### Task 1: Create timeline persistence utilities
- [x] Create `src/utils/timelineUtils.js` with functions to merge locked cards
- [x] Implement `addLockedCard(timeline, cardData)` function
- [x] Implement `filterIncorrectCards(timeline)` function
- [x] Add unit tests for timeline utilities

### Task 2: Update Timeline component for locked cards
- [x] Modify `src/components/Timeline.jsx` to support locked state
- [x] Add visual distinction for locked cards (non-draggable)
- [x] Ensure locked cards persist through re-renders
- [x] Add component tests for locked card behavior

### Task 3: Implement round resolution logic
- [x] Update game state resolution to lock correct placements
- [x] Add logic to discard incorrect placements
- [x] Sync timeline state with backend via game_states table
- [x] Add integration tests for round resolution

### Task 4: Backend synchronization
- [x] Update Supabase game_states schema to include timeline
- [x] Implement timeline persistence in real-time updates
- [x] Add reconnection sync logic for timeline state
- [x] Test timeline persistence across page refreshes

## Review Findings

### Decision Needed
- [x] [Review][Decision] Standardize on `song_id` everywhere — Inconsistent use of `id` vs `song_id` across timelineUtils.js, Timeline.jsx, and GameScreen.jsx. Decision: Use `song_id` for all song identifiers to match database schema.

### Patches
- [x] [Review][Patch] Fix per-player correct song tracking in triggerReveal with Promise.all for parallel updates [src/components/GameScreen.jsx]
- [x] [Review][Patch] Fix filterIncorrectCards to handle per-player correctness [src/utils/timelineUtils.js]
- [x] [Review][Patch] Add setPlacedSongs call in syncTimelineState to update local state [src/components/GameScreen.jsx]
- [x] [Review][Patch] Subscription cleanup on component unmount already implemented [src/components/GameScreen.jsx]
- [x] [Review][Patch] Use useMemo for lockedSongs transformation to prevent unnecessary re-renders [src/components/GameScreen.jsx]
- [x] [Review][Patch] Update PropTypes to include is_locked and song_id fields [src/components/Timeline.jsx]
- [x] [Review][Patch] Fix current song hide logic with useMemo [src/components/GameScreen.jsx]
- [x] [Review][Patch] Change hardcoded default year from 2020 to null [src/components/GameScreen.jsx]

## Dev Notes

### Technical Context
- Timeline persistence should happen after the reveal phase completes
- Locked cards must be immutable for the remainder of the match
- Backend sync should use existing game_states table structure
- Timeline state should be part of the real-time subscription

### Implementation Approach
1. Use React state management for local timeline
2. Leverage existing Supabase real-time subscriptions
3. Follow existing component patterns in the codebase
4. Ensure backward compatibility with existing timeline functionality

## Dev Agent Record

### Debug Log
- Created timelineUtils.js with core timeline management functions
- Updated Timeline.jsx to support locked card state with visual indicators
- Enhanced GameScreen.jsx with round resolution logic and real-time sync
- Added comprehensive test coverage for all timeline functionality

### Implementation Plan
- Built timeline utilities for locking correct placements and filtering incorrect ones
- Modified Timeline component to render locked cards as non-draggable with visual distinction
- Implemented round resolution logic in GameScreen to lock/discard cards based on correctness
- Enhanced real-time subscriptions for timeline synchronization
- Added reconnection sync logic for timeline persistence across page refreshes

### Completion Notes
✅ Successfully implemented timeline persistence for correct placements
✅ All incorrect placements are discarded during round resolution
✅ Locked cards are visually distinct and non-draggable
✅ Timeline state is synchronized with backend via game_states table
✅ Real-time updates ensure timeline consistency across reconnections
✅ Comprehensive test coverage validates all functionality

## File List
- src/utils/timelineUtils.js - Core timeline management utilities
- src/utils/timelineUtils.test.js - Unit tests for timeline utilities
- src/utils/roundResolution.test.js - Integration tests for round resolution
- src/utils/timelinePersistence.test.js - Tests for persistence and sync
- src/components/Timeline.jsx - Updated to support locked card state
- src/components/Timeline.test.jsx - Enhanced tests for locked card behavior
- src/components/GameScreen.jsx - Enhanced with round resolution and sync logic
- src/index.css - Added styles for locked card appearance

## Change Log
- 2026-04-26: Created timeline utilities with addLockedCard, filterIncorrectCards, mergeLockedCards functions
- 2026-04-26: Updated Timeline component to support is_locked property with visual indicators and non-draggable behavior
- 2026-04-26: Enhanced GameScreen triggerReveal function to lock correct placements and discard incorrect ones
- 2026-04-26: Added real-time timeline synchronization and reconnection sync logic
- 2026-04-26: Added comprehensive test coverage for all timeline functionality
- 2026-04-26: Updated CSS with locked card styling (opacity, background, cursor, lock indicator)

## Status
done

## Definition of Done
- [ ] Correct songs permanently join the timeline display
- [ ] Incorrect songs are successfully discarded
- [ ] Locked songs are not draggable
- [ ] Timeline state is synced with the backend
- [ ] Code reviewed and merged
