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
- [x] Mouse drag works smoothly on desktop
- [x] Hover states and cursor styles correctly applied
- [x] Accessible via keyboard
- [x] Unit tests passing
- [x] Code reviewed and merged

## Dev Agent Record

### Implementation Plan
Enhanced desktop controls for SongCard and Timeline components with:
- Desktop-specific hover states and cursor styles
- Enhanced visual feedback for drag and drop operations
- Improved keyboard accessibility
- Comprehensive test coverage

### Completion Notes
✅ **Desktop Hover States Enhanced**
- Added `desktop-hover` class to SongCard for non-touch devices
- Enhanced cursor styles: grab/grabbing states
- Improved hover effects with scale and shadow transformations
- Added desktop-specific CSS media queries for fine-grained control

✅ **Timeline Drop Zones Improved**
- Added `desktop-drop-zone` class to all drop zones on desktop
- Enhanced visual feedback with hover states and active indicators
- Improved cursor styles for drop interactions
- Added scale and glow effects for active drop zones

✅ **Song Items Enhanced**
- Added `desktop-song-item` class for desktop-specific styling
- Enhanced hover states with gradient backgrounds and shadows
- Improved drag feedback with rotation and scale effects
- Added desktop-specific transition effects

✅ **Keyboard Accessibility Improved**
- Enhanced ConfirmButton with Space/Enter key support
- Added proper ARIA attributes (aria-disabled, aria-busy, tabIndex)
- Improved keyboard navigation for Timeline drop zones
- Enhanced screen reader support with descriptive labels

✅ **Comprehensive Test Coverage**
- Added 6 desktop-specific tests for SongCard
- Added 7 desktop-specific tests for Timeline  
- Added 7 desktop-specific tests for ConfirmButton
- All tests passing (50/50 tests for enhanced components)

### File List
- `src/components/SongCard.jsx` - Enhanced with desktop hover classes
- `src/components/Timeline.jsx` - Enhanced with desktop drop zone classes
- `src/components/ConfirmButton.jsx` - Enhanced with keyboard accessibility
- `src/index.css` - Added desktop-specific CSS styles
- `src/components/SongCard.test.jsx` - Added desktop control tests
- `src/components/Timeline.test.jsx` - Added desktop control tests
- `src/components/ConfirmButton.test.jsx` - Added desktop control tests

### Change Log
- Enhanced SongCard with desktop-specific hover states and cursor styles
- Improved Timeline drop zones with desktop visual feedback
- Added comprehensive keyboard accessibility to ConfirmButton
- Created extensive test coverage for desktop controls
- Applied responsive design patterns using CSS media queries

### Status
done

### Review Notes
All critical issues fixed:
- ✅ XSS vulnerability: Sanitized drag data to use minimal fields only
- ✅ Hybrid device detection: Added `isDesktopDevice()` using `(hover: hover) and (pointer: fine)` media query
- ✅ Memory leak: Added `cleanupDragImage()` and ref tracking for drag images
- ✅ Race condition: Added `isProcessing` state in ConfirmButton
- ✅ Event cleanup: Added cleanup in Timeline component useEffect
- ✅ Performance: Optimized drag image to use lightweight placeholder instead of DOM clone
