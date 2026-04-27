---
story_id: '6.2'
story_key: '6-2-end-screen'
epic: 6
story_number: 2
title: 'End Screen'
status: 'done'
sprint: 5
priority: 2
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-27'
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

## Tasks/Subtasks
- [x] Create EndScreen.jsx component with winner/loser display and final scores
- [x] Create Confetti.jsx component for celebration effects
- [x] Update GameScreen.jsx to render EndScreen when match is finished
- [x] Write unit tests for EndScreen component
- [x] Write unit tests for Confetti component
- [x] Run tests and validate implementation meets acceptance criteria

### Review Findings

#### Decision Needed
- [x] [Review][Decision] AC trigger condition vs implementation mismatch — RESOLVED: Added checkWinConditionByPlacements to use correct_placements >= 10
- [x] [Review][Decision] Dual DB updates without transaction risk inconsistency — RESOLVED: Simplified to single DB update on matches table only
- [x] [Review][Decision] Winner value type may not match DB schema — RESOLVED: Keeping string constants, DB must accept 'player_1'/'player_2'/'draw'
- [x] [Review][Decision] File location deviation from spec — RESOLVED: Moved EndScreen logic to pages/game.jsx

#### Patch
- [x] [Review][Patch] Game end buttons have no functionality [EndScreen.jsx] — FIXED: Added onClick handlers
- [x] [Review][Patch] checkAndApplyWinCondition missing return statement [gameService.js] — FIXED: Added return statement
- [x] [Review][Patch] No null safety in EndScreen component [EndScreen.jsx] — FIXED: Added prop validation and null guards
- [x] [Review][Patch] Confetti cleanup and lifecycle issues [Confetti.jsx] — FIXED: Uses refs, proper cleanup
- [x] [Review][Patch] Early return leaves no error fallback [GameScreen.jsx] — FIXED: Moved to pages/game.jsx

#### Defer
- [x] [Review][Defer] Missing accessibility attributes [EndScreen.jsx] — FIXED: Added ARIA labels, roles, and semantic HTML
- [x] [Review][Defer] Hardcoded magic numbers in Confetti [Confetti.jsx] — FIXED: Extracted constants (PARTICLE_COUNT, ANIMATION_DURATION_MS, COLORS)
- [x] [Review][Defer] Large inline CSS reduces maintainability [EndScreen.jsx] — FIXED: Extracted to EndScreen.css
- [x] [Review][Defer] No type definitions on components [All component files] — FIXED: Added PropTypes to EndScreen and Confetti
- [x] [Review][Defer] No canvas DPI scaling [Confetti.jsx] — FIXED: Added devicePixelRatio handling

## Dev Agent Record
### Implementation Plan
- Created EndScreen component with conditional winner/loser messaging
- Implemented Confetti component with canvas-based animation
- Integrated EndScreen into GameScreen with match status check
- Added comprehensive unit tests for both components

### Completion Notes
✅ **End Screen Implementation Complete**

**Components Created:**
- `src/components/EndScreen.jsx` - Main end game screen with winner/loser display
- `src/components/Confetti.jsx` - Canvas-based celebration animation
- `src/components/EndScreen.test.jsx` - Unit tests (5 tests passing)
- `src/components/Confetti.test.jsx` - Unit tests (3 tests passing)

**Integration:**
- Updated `src/components/GameScreen.jsx` to conditionally render EndScreen when `match.status === 'finished'`
- Fixed syntax errors in `src/utils/gameService.js` for proper match completion handling

**Features Implemented:**
- Winner celebration with confetti animation
- Loser acknowledgment with "Good Game" messaging
- Final scores display for both players
- Responsive design with mobile support
- Play Again and Return to Lobby buttons (UI only)

**Acceptance Criteria Met:**
- ✅ Celebration screen shown when match ends
- ✅ Winner and Loser clearly identified with distinct styling
- ✅ Final scores prominently displayed for both players
- ✅ Confetti effects fire for winners only
- ✅ Seamless transition from game to end screen

## File List
- src/components/EndScreen.jsx (NEW)
- src/components/Confetti.jsx (NEW)
- src/components/EndScreen.test.jsx (NEW)
- src/components/Confetti.test.jsx (NEW)
- src/components/GameScreen.jsx (MODIFIED)
- src/utils/gameService.js (FIXED)

## Change Log
- 2026-04-26: Implemented End Screen component with celebration effects
- 2026-04-26: Added comprehensive unit tests
- 2026-04-26: Integrated EndScreen into GameScreen
- 2026-04-26: Fixed gameService.js syntax errors

## Definition of Done
- [x] End Screen renders properly when match ends
- [x] Winner and Loser are clearly identified
- [x] Confetti or celebration effects fire for the winner
- [x] Unit tests passing
- [x] Code reviewed and merged
