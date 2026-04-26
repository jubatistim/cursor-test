---
story_id: '7.2'
story_key: '7-2-mobile-controls'
epic: 7
story_number: 2
title: 'Mobile Controls'
status: 'ready-for-dev'
sprint: 5
priority: 2
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '7-1-desktop-controls'
---

# Story 7.2: Mobile Controls

## User Story

**As a** mobile player,  
**I want** to use touch controls,  
**So that** I can play on my phone or tablet.

## Acceptance Criteria

**Given** I am playing on a mobile browser  
**When** I interact with the game  
**Then** I can touch and drag song cards  
**And** tap buttons to confirm actions  
**And** the UI is sized appropriately for touch

## Technical Requirements

### Touch Event Handling
- Map native touch events (`touchstart`, `touchmove`, `touchend`) properly or rely on a robust library (like `dnd-kit`'s touch sensor) to ensure drag actions work naturally.
- Prevent default browser scrolling behaviors (like pull-to-refresh) during drag interactions on the timeline.

### Mobile UI Sizing
- Minimum touch target sizing (44x44px for iOS/Android standards).
- Prevent viewport scaling (`user-scalable=no`).

## File Structure Requirements

```
src/
├── components/
│   ├── SongCard.jsx           # Ensure mobile touch hooks attached
│   └── Timeline.jsx           # Scroll prevention during drag
```

## Definition of Done
- [ ] Touch drag feels responsive and natural
- [ ] No unwanted page scrolling occurs during interactions
- [ ] Hitboxes and buttons are appropriately sized for fingers
- [ ] Unit tests passing
- [ ] Code reviewed and merged
