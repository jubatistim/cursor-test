---
story_id: '7.2'
story_key: '7-2-mobile-controls'
epic: 7
story_number: 2
title: 'Mobile Controls'
status: 'done'
sprint: 5
priority: 2
estimated_hours: 3
created: '2026-04-26'
last_updated: '2026-04-27'
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
- [x] Touch drag feels responsive and natural
- [x] No unwanted page scrolling occurs during interactions
- [x] Hitboxes and buttons are appropriately sized for fingers
- [x] Unit tests passing
- [x] Code reviewed and merged

## Implementation Notes

### Touch Detection Improvements
- Fixed `supportsTouch()` to work with hybrid devices (touch + mouse)
- Added `isTouchPrimaryDevice()` to distinguish touch-first devices
- Added viewport meta tag with `user-scalable=no` (already present in index.html)

### Drag & Drop Fixes
- Implemented touch drag threshold detection (10px movement or 300ms long press)
- Added proper touch event handlers (touchstart, touchmove, touchend, touchcancel)
- Fixed drag data persistence for touch events using refs
- Integrated haptic feedback via `navigator.vibrate()`

### Scroll Prevention
- Added body class toggling (`touch-dragging`, `no-scroll`) during touch drag
- Implemented CSS rules to prevent scrolling during drag operations

### Touch Target Sizing
- Added minimum 44x44px touch targets for all interactive elements
- Added `touch-action: manipulation` for better touch responsiveness

### CSS Additions
- Added touch-specific styles for primary touch devices
- Added hybrid device support
- Prevented text selection during touch interactions

### Testing
- Enhanced mobile touch test coverage
- Added tests for drag threshold
- Added tests for long-press detection
- Added tests for touch cancel handling
