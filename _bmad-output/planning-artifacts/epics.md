---
stepsCompleted: ['prerequisites-validation']
inputDocuments:
  - /media/juliano-batistim/DATA-EMPIRE1/dev/cursor-test/_bmad-output/gdd.md
  - /media/juliano-batistim/DATA-EMPIRE1/dev/cursor-test/_bmad-output/game-brief.md
project_name: 'Hitster Web'
game_type: 'party-game'
architecture:
  hosting: Netlify
  backend: Supabase
  assets: Cloudinary
---

# Hitster Web - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Hitster Web, a simple web-based party game for playing with family and friends. The requirements are decomposed from the GDD into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Room Management - Players can create a game room and receive a unique 6-character room code
FR2: Room Management - Players can join an existing room by entering the room code
FR3: Room Management - Host can confirm all players are present and start the match
FR4: Song Playback - System plays a 15-30 second song snippet from the catalog
FR5: Song Playback - All players hear the same song snippet simultaneously
FR6: Timeline Placement - Players can drag a song card to their personal vertical timeline
FR7: Timeline Placement - Players can position songs before, between, or after existing songs
FR8: Timeline Placement - Players can confirm or cancel their placement
FR9: Scoring System - System awards +1 point for correct chronological placement
FR10: Scoring System - System shows 0 points for incorrect placement and reveals correct position
FR11: Scoring System - Optional bonus: +1 extra point for guessing artist and track title
FR12: Round Resolution - System reveals correct release year after all players submit
FR13: Round Resolution - Correctly placed songs are locked into each player's timeline
FR14: Round Resolution - New song begins after a 3-second transition
FR15: Match Management - System detects when a player reaches 10 correct placements
FR16: Match Management - System announces winner and displays final scores
FR17: Match Management - Players can start a rematch in the same room with one click
FR18: Controls - Desktop: Click and drag to place songs on timeline
FR19: Controls - Mobile: Touch and drag to place songs on timeline
FR20: Timeout Handling - Player forfeits turn (0 points) if not placing within 60 seconds

### Non-Functional Requirements

NFR1: Platform - Web browser only (desktop and mobile responsive)
NFR2: Performance - Room setup and match start within 2 minutes
NFR3: Performance - Smooth, responsive UI with no lag during gameplay
NFR4: Reliability - No state desync between players in 2-player sessions
NFR5: Stability - No blocker bugs during a full match to 10 songs
NFR6: Architecture - Hosted on Netlify with Supabase backend and Cloudinary assets
NFR7: Simplicity - MVP scope focused on 2-player gameplay only
NFR8: Testing - TDD approach with test coverage for core gameplay rules
NFR9: Content - Configurable song catalog (~500 tracks) with Spotify integration

### Additional Requirements

- Architecture: Netlify for hosting/deployment
- Architecture: Supabase for database and backend services
- Architecture: Cloudinary for asset hosting and management
- Architecture: Spotify API integration for song playback and metadata
- Architecture: Simple, maintainable codebase for solo development
- Architecture: Server-side validation for critical game actions

### FR Coverage Map

| FR | Epic | Stories |
|----|------|---------|
| FR1-FR3 | Epic 1: Room Management | 1.1, 1.2, 1.3 |
| FR4-FR5 | Epic 2: Song Playback | 2.1, 2.2 |
| FR6-FR8 | Epic 3: Timeline Placement | 3.1, 3.2, 3.3 |
| FR9-FR11 | Epic 4: Scoring System | 4.1, 4.2 |
| FR12-FR14 | Epic 5: Round Resolution | 5.1, 5.2, 5.3 |
| FR15-FR17 | Epic 6: Match Management | 6.1, 6.2, 6.3 |
| FR18-FR19 | Epic 7: Controls | 7.1, 7.2 |
| FR20 | Epic 5: Round Resolution | 5.4 |

## Epic List

1. **Epic 1: Room Management** - Create and join game rooms with codes
2. **Epic 2: Song Playback** - Play song snippets via Spotify integration
3. **Epic 3: Timeline Placement** - Drag-and-drop song placement on vertical timeline
4. **Epic 4: Scoring System** - Track and display player scores
5. **Epic 5: Round Resolution** - Handle turn flow and round completion
6. **Epic 6: Match Management** - Win detection, end screen, rematch
7. **Epic 7: Controls** - Desktop and mobile input handling

---

## Epic 1: Room Management

Enable players to create game rooms, share room codes, and start matches together.

### Story 1.1: Create Room

As a host player,
I want to create a new game room,
So that I can play with my partner.

**Acceptance Criteria:**

**Given** I am on the home screen
**When** I click "Create Room"
**Then** a unique 6-character room code is generated
**And** I am taken to the room lobby screen

### Story 1.2: Join Room

As a joining player,
I want to enter a room code,
So that I can join my partner's game.

**Acceptance Criteria:**

**Given** I am on the home screen
**When** I enter a valid 6-character room code and click "Join"
**Then** I am connected to that room's lobby
**And** the host sees me as a connected player

### Story 1.3: Start Match

As the host,
I want to start the match when everyone is ready,
So that we can begin playing.

**Acceptance Criteria:**

**Given** all players are connected in the room
**When** I click "Start Match"
**Then** the game transitions to the first round
**And** all players see the game begin

---

## Epic 2: Song Playback

Play song snippets from the catalog so players can identify and place them.

### Story 2.1: Play Song Snippet

As a player,
I want to hear a song snippet,
So that I can identify when it was released.

**Acceptance Criteria:**

**Given** a new round has started
**When** the round begins
**Then** a 15-30 second song snippet plays
**And** I can hear it clearly

### Story 2.2: Sync Playback

As a player,
I want all players to hear the same song at the same time,
So that we're all making decisions based on the same information.

**Acceptance Criteria:**

**Given** multiple players are in the room
**When** a song snippet plays
**Then** all players hear the same song
**And** playback starts within network tolerance for all players

---

## Epic 3: Timeline Placement

Allow players to place songs on their personal timeline.

### Story 3.1: Drag to Place

As a player,
I want to drag a song card to my timeline,
So that I can indicate where I think it belongs chronologically.

**Acceptance Criteria:**

**Given** I have heard the song snippet
**When** I click/touch and drag the song card
**Then** I can move it freely over my timeline
**And** I see a visual indicator of where it will be placed

### Story 3.2: Insert at Position

As a player,
I want to insert the song before, between, or after existing songs,
So that I can build my chronological timeline.

**Acceptance Criteria:**

**Given** I am dragging a song card
**When** I position it on the timeline
**Then** the insertion point is highlighted
**And** existing songs shift to show where the new song will go

### Story 3.3: Confirm Placement

As a player,
I want to confirm my placement,
So that my answer is locked in.

**Acceptance Criteria:**

**Given** I have positioned a song on my timeline
**When** I click/tap to confirm
**Then** my placement is submitted
**And** I see a "waiting for other player" state

---

## Epic 4: Scoring System

Track and display scores for each player.

### Story 4.1: Award Points

As a player,
I want to earn points for correct placements,
So that I can track my progress toward winning.

**Acceptance Criteria:**

**Given** I placed a song on my timeline
**When** the correct position is revealed
**Then** I receive +1 point if my placement was chronologically correct
**And** I receive 0 points if my placement was incorrect

### Story 4.2: Display Score

As a player,
I want to see my score and my opponent's score,
So that I know who is winning.

**Acceptance Criteria:**

**Given** a round has been resolved
**When** scores are updated
**Then** both players can see the current scores
**And** the scores are clearly visible throughout the game

---

## Epic 5: Round Resolution

Handle the flow of each round from placement to the next song.

### Story 5.1: Reveal Correctness

As a player,
I want to see the correct release year after placing,
So that I can learn and adjust my strategy.

**Acceptance Criteria:**

**Given** all players have submitted their placements
**When** the round resolves
**Then** the correct release year is displayed
**And** each player's placement is shown as correct or incorrect

### Story 5.2: Lock Correct Placements

As a player,
I want my correct placements to stay on my timeline,
So that I can see my progress.

**Acceptance Criteria:**

**Given** I placed a song correctly
**When** the round resolves
**Then** the song is locked into my timeline
**And** it remains visible for the rest of the match

### Story 5.3: Next Round Transition

As a player,
I want a brief transition before the next song,
So that I can prepare for the next round.

**Acceptance Criteria:**

**Given** a round has been resolved
**When** 3 seconds have passed
**Then** the next song snippet begins
**And** the new round starts

### Story 5.4: Timeout Handling

As a player,
I want the game to handle stalled players,
So that matches don't get stuck.

**Acceptance Criteria:**

**Given** a player hasn't placed within 60 seconds
**When** the timeout expires
**Then** that player receives 0 points for this round
**And** the round proceeds to resolution

---

## Epic 6: Match Management

Handle match end conditions and rematches.

### Story 6.1: Win Detection

As the system,
I want to detect when a player reaches 10 correct placements,
So that the match can end.

**Acceptance Criteria:**

**Given** a round has been resolved
**When** a player has 10 or more correct placements
**Then** the match ends
**And** that player is declared the winner

### Story 6.2: End Screen

As a player,
I want to see the final results,
So that I know who won and can celebrate.

**Acceptance Criteria:**

**Given** a player has reached 10 correct placements
**When** the match ends
**Then** a celebration screen is shown
**And** final scores for both players are displayed

### Story 6.3: Rematch

As a player,
I want to start a new match in the same room,
So that we can play again quickly.

**Acceptance Criteria:**

**Given** the match has ended
**When** I click "Play Again"
**Then** a new match starts in the same room
**And** scores are reset to 0

---

## Epic 7: Controls

Support both desktop and mobile input methods.

### Story 7.1: Desktop Controls

As a desktop player,
I want to use mouse controls,
So that I can play comfortably on my computer.

**Acceptance Criteria:**

**Given** I am playing on a desktop browser
**When** I interact with the game
**Then** I can click and drag song cards
**And** click buttons to confirm actions

### Story 7.2: Mobile Controls

As a mobile player,
I want to use touch controls,
So that I can play on my phone or tablet.

**Acceptance Criteria:**

**Given** I am playing on a mobile browser
**When** I interact with the game
**Then** I can touch and drag song cards
**And** tap buttons to confirm actions
**And** the UI is sized appropriately for touch

---

## Sprint Plan

### Sprint 1: Foundation (Week 1-2)
- Story 1.1: Create Room
- Story 1.2: Join Room
- Story 1.3: Start Match
- Setup: Netlify, Supabase, basic project structure

### Sprint 2: Core Gameplay (Week 3-4)
- Story 2.1: Play Song Snippet
- Story 2.2: Sync Playback
- Story 3.1: Drag to Place
- Story 3.2: Insert at Position

### Sprint 3: Scoring & Resolution (Week 5-6)
- Story 3.3: Confirm Placement
- Story 4.1: Award Points
- Story 4.2: Display Score
- Story 5.1: Reveal Correctness

### Sprint 4: Match Flow (Week 7-8)
- Story 5.2: Lock Correct Placements
- Story 5.3: Next Round Transition
- Story 5.4: Timeout Handling
- Story 6.1: Win Detection

### Sprint 5: Polish (Week 9-10)
- Story 6.2: End Screen
- Story 6.3: Rematch
- Story 7.1: Desktop Controls
- Story 7.2: Mobile Controls