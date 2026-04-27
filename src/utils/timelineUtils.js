/**
 * Timeline utilities for managing locked and unlocked song placements
 * Used for round resolution to lock correct placements and discard incorrect ones
 */

/**
 * Add a locked card to the timeline
 * @param {Array} timeline - Existing timeline array of locked cards
 * @param {Object} cardData - Song card data to lock
 * @param {number} position - Position where the card was placed
 * @returns {Array} Updated timeline with the new locked card
 */
export function addLockedCard(timeline = [], cardData, position) {
  if (!cardData || !cardData.id) {
    throw new Error('Card data must include an id');
  }
  
  if (typeof position !== 'number' || position < 0) {
    throw new Error('Position must be a non-negative number');
  }

  // Check if card is already locked
  const existingCard = timeline.find(card => card.song_id === cardData.id);
  if (existingCard) {
    return timeline; // Card already locked, return unchanged timeline
  }

  const lockedCard = {
    song_id: cardData.id,
    title: cardData.title,
    artist: cardData.artist,
    release_year: cardData.release_year,
    position: position,
    locked_at: new Date().toISOString(),
    is_locked: true
  };

  // Create new timeline with the locked card inserted at correct position
  const newTimeline = [...timeline];
  newTimeline.splice(position, 0, lockedCard);
  
  // Re-index all cards after the inserted position
  return newTimeline.map((card, index) => ({
    ...card,
    position: index
  }));
}

/**
 * Filter out incorrect cards from timeline
 * @param {Array} timeline - Current timeline including both locked and temporary cards
 * @param {Array} correctSongIds - Array of song IDs that were correctly placed
 * @returns {Array} Timeline with only correct (locked) cards
 */
export function filterIncorrectCards(timeline = [], correctSongIds = []) {
  if (!Array.isArray(correctSongIds)) {
    throw new Error('correctSongIds must be an array');
  }

  return timeline
    .filter(card => correctSongIds.includes(card.song_id))
    .map((card, index) => ({
      ...card,
      position: index,
      is_locked: true // Ensure all remaining cards are marked as locked
    }));
}

/**
 * Merge new locked cards into existing timeline
 * @param {Array} existingTimeline - Current locked timeline
 * @param {Array} newLockedCards - New cards to lock in this round
 * @returns {Array} Merged timeline with all cards properly indexed
 */
export function mergeLockedCards(existingTimeline = [], newLockedCards = []) {
  const merged = [...existingTimeline];
  
  // Add new locked cards that don't already exist
  for (const newCard of newLockedCards) {
    if (!merged.find(card => card.song_id === newCard.song_id)) {
      merged.push({
        ...newCard,
        is_locked: true,
        locked_at: newCard.locked_at || new Date().toISOString()
      });
    }
  }
  
  // Sort by position and re-index
  return merged
    .sort((a, b) => a.position - b.position)
    .map((card, index) => ({
      ...card,
      position: index
    }));
}

/**
 * Check if a song is locked in the timeline
 * @param {Array} timeline - Timeline to check
 * @param {string} songId - Song ID to check
 * @returns {boolean} True if song is locked
 */
export function isSongLocked(timeline = [], songId) {
  const card = timeline.find(card => card.song_id === songId);
  return !!(card && card.is_locked === true);
}

/**
 * Get all locked cards from timeline
 * @param {Array} timeline - Timeline to filter
 * @returns {Array} Array of locked cards only
 */
export function getLockedCards(timeline = []) {
  return timeline.filter(card => card.is_locked === true);
}

/**
 * Get timeline statistics
 * @param {Array} timeline - Timeline to analyze
 * @returns {Object} Statistics about the timeline
 */
export function getTimelineStats(timeline = []) {
  const lockedCards = getLockedCards(timeline);
  const unlockedCards = timeline.filter(card => !card.is_locked);
  
  return {
    total_cards: timeline.length,
    locked_cards: lockedCards.length,
    unlocked_cards: unlockedCards.length,
    positions: timeline.map(card => card.position).sort((a, b) => a - b)
  };
}
