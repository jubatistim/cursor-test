---
story_id: '4.2'
story_key: '4-2-display-score'
epic: 4
story_number: 2
title: 'Display Score'
status: 'ready-for-dev'
sprint: 3
priority: 2
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '4-1-award-points'
---

# Story 4.2: Display Score

## User Story

**As a** player,  
**I want** to see my score and my opponent's score,  
**So that** I know who is winning.

## Acceptance Criteria

**Given** a round has been resolved  
**When** scores are updated  
**Then** both players can see the current scores  
**And** the scores are clearly visible throughout the game

## Technical Requirements

### Score UI Component
- Add a prominent score display at the top of the screen (e.g., `Player 1: 3 | Player 2: 2`).
- Include subtle animations (e.g., number bump, color pulse) when the score increments.

### Real-time Score Updates
- Component should reactively update when the backend `game_states` changes the score values.

## Architecture Compliance

### State Management
- React context or hook subscribing to the real-time score updates from Supabase.
- Avoid full page re-renders on score updates; update only the specific component.

## File Structure Requirements

```
src/
├── components/
│   ├── ScoreBoard.jsx         # NEW: Score UI component
│   └── GameScreen.jsx         # Integration of ScoreBoard
```

## Testing Requirements

### Unit Tests
- Component displays the correct scores passed via props or context.
- Animations trigger upon score change.

### Integration Tests
- Component updates live when `game_states` table updates in Supabase.

## Definition of Done

- [ ] ScoreBoard component is implemented and styled
- [ ] Real-time updates reflect accurately in the UI
- [ ] Animation triggers upon point gain
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged
