/**
 * Scoring utilities for Hitster Web
 * Calculates whether a player's song placement is chronologically correct.
 */

/**
 * Determine if a placed song is in the correct chronological position.
 *
 * A placement is correct when:
 *   - Every song before the placed index has a release year <= placedSong.year
 *   - Every song after the placed index has a release year >= placedSong.year
 *
 * @param {Array<{year: number}>} timeline - Ordered array of song objects (player's current timeline)
 * @param {number} placedIndex - Zero-based index where the new song was inserted
 * @returns {boolean} true if placement is chronologically correct
 */
export function isPlacementCorrect(timeline, placedIndex) {
  if (!Array.isArray(timeline) || timeline.length === 0) return false;
  if (typeof placedIndex !== 'number' || placedIndex < 0 || placedIndex >= timeline.length) return false;

  const placedYear = timeline[placedIndex]?.year;
  if (typeof placedYear !== 'number') return false;

  for (let i = 0; i < placedIndex; i++) {
    if (typeof timeline[i]?.year !== 'number') return false;
    if (timeline[i].year > placedYear) return false;
  }

  for (let i = placedIndex + 1; i < timeline.length; i++) {
    if (typeof timeline[i]?.year !== 'number') return false;
    if (timeline[i].year < placedYear) return false;
  }

  return true;
}

/**
 * Calculate points awarded for a placement.
 * Returns 1 for a correct placement, 0 otherwise.
 *
 * @param {Array<{year: number}>} timeline
 * @param {number} placedIndex
 * @returns {number} 1 or 0
 */
export function calculatePoints(timeline, placedIndex) {
  return isPlacementCorrect(timeline, placedIndex) ? 1 : 0;
}
