---
story_id: '7.1'
story_key: '7-1-desktop-controls'
epic: 7
story_number: 1
title: 'Desktop Controls'
status: 'ready-for-dev'
sprint: 5
priority: 1
estimated_hours: 2
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '3-1-drag-to-place'
---

# Story 7.1: Desktop Controls

## User Story

**As a** desktop player,  
**I want** to use mouse controls,  
**So that** I can play comfortably on my computer.

## Acceptance Criteria

**Given** I am playing on a desktop browser  
**When** I interact with the game  
**Then** I can click and drag song cards  
**And** click buttons to confirm actions

## Technical Requirements

### Mouse Drag & Drop
- Use native HTML5 Drag and Drop API or a library like `dnd-kit` optimized for desktop interaction.
- Provide clear visual hover states (`cursor: grab` and `cursor: grabbing`).

### Keyboard Accessibility
- Ensure all confirm/action buttons can be focused using the `Tab` key and triggered with `Enter` or `Space`.

## File Structure Requirements

```
src/
├── components/
│   ├── SongCard.jsx           # Refine desktop hover states
│   └── Timeline.jsx           # Desktop drop zones
```

## Definition of Done
- [ ] Mouse drag works smoothly on desktop
- [ ] Hover states and cursor styles correctly applied
- [ ] Accessible via keyboard
- [ ] Unit tests passing
- [ ] Code reviewed and merged
