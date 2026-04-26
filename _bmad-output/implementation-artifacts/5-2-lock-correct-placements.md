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

## Definition of Done
- [ ] Correct songs permanently join the timeline display
- [ ] Incorrect songs are successfully discarded
- [ ] Locked songs are not draggable
- [ ] Timeline state is synced with the backend
- [ ] Code reviewed and merged
