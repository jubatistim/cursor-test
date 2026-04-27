/**
 * Win Detection utilities for Hitster Web
 * Determines when a player has reached the win condition (10 correct placements)
 */

const WIN_THRESHOLD = 10;
const CORRECT_PLACEMENTS_THRESHOLD = 10;

const ERRORS = {
  INVALID_SCORE: 'Score must be a non-negative number',
  INVALID_PLAYER_SCORES: 'Both player scores must be non-negative numbers'
};

/**
 * Check if a player has won the match based on their score.
 * A player wins when their score reaches or exceeds 10.
 * 
 * @param {number} playerScore - The player's current score
 * @returns {boolean} true if player score >= 10, false otherwise
 * @throws {Error} if score is invalid
 */
export function hasPlayerWon(playerScore) {
  if (playerScore === null || playerScore === undefined) {
    throw new Error(ERRORS.INVALID_SCORE);
  }

  if (typeof playerScore !== 'number' || isNaN(playerScore)) {
    throw new Error(ERRORS.INVALID_SCORE);
  }

  if (playerScore < 0) {
    throw new Error(ERRORS.INVALID_SCORE);
  }

  return playerScore >= WIN_THRESHOLD;
}

/**
 * Determine the winner between two players based on their scores.
 * Handles three scenarios:
 *   - One player has 10+ points: that player wins
 *   - Both players have 10+ points: "draw" (simultaneous win/tiebreaker)
 *   - Neither player has 10+ points: null (match continues)
 * 
 * @param {number} player1Score - Player 1's current score
 * @param {number} player2Score - Player 2's current score
 * @returns {string|null} 'player_1', 'player_2', 'draw', or null if no winner
 * @throws {Error} if scores are invalid
 */
export function determineWinner(player1Score, player2Score) {
  if (
    player1Score === null || 
    player1Score === undefined ||
    player2Score === null || 
    player2Score === undefined
  ) {
    throw new Error(ERRORS.INVALID_PLAYER_SCORES);
  }

  if (
    typeof player1Score !== 'number' || 
    typeof player2Score !== 'number' ||
    isNaN(player1Score) || 
    isNaN(player2Score)
  ) {
    throw new Error(ERRORS.INVALID_PLAYER_SCORES);
  }

  if (player1Score < 0 || player2Score < 0) {
    throw new Error(ERRORS.INVALID_PLAYER_SCORES);
  }

  const player1Won = hasPlayerWon(player1Score);
  const player2Won = hasPlayerWon(player2Score);

  // Both players hit 10 at the same time (draw/tie situation)
  if (player1Won && player2Won) {
    return 'draw';
  }

  // Only player 1 won
  if (player1Won) {
    return 'player_1';
  }

  // Only player 2 won
  if (player2Won) {
    return 'player_2';
  }

  // Neither player has won yet
  return null;
}

/**
 * Check the complete win condition for a match.
 * Returns an object with:
 *   - isWinState: boolean indicating if match should end
 *   - winner: 'player_1', 'player_2', 'draw', or null
 * 
 * @param {number} player1Score - Player 1's current score
 * @param {number} player2Score - Player 2's current score
 * @returns {Object} { isWinState: boolean, winner: string|null }
 * @throws {Error} if scores are invalid
 */
export function checkWinCondition(player1Score, player2Score) {
  const winner = determineWinner(player1Score, player2Score);
  
  return {
    isWinState: winner !== null,
    winner
  };
}

/**
 * Check if a player has won based on correct placements count.
 * A player wins when their correct placements reach or exceed 10.
 * 
 * @param {number} correctPlacements - The player's current correct placements count
 * @returns {boolean} true if correctPlacements >= CORRECT_PLACEMENTS_THRESHOLD
 * @throws {Error} if correctPlacements is invalid
 */
export function hasPlayerWonByPlacements(correctPlacements) {
  if (correctPlacements === null || correctPlacements === undefined) {
    throw new Error('Correct placements must be a non-null value');
  }

  if (typeof correctPlacements !== 'number' || isNaN(correctPlacements)) {
    throw new Error('Correct placements must be a number');
  }

  if (correctPlacements < 0) {
    throw new Error('Correct placements cannot be negative');
  }

  return correctPlacements >= CORRECT_PLACEMENTS_THRESHOLD;
}

/**
 * Determine the winner between two players based on their correct placements.
 * Handles three scenarios:
 *   - One player has 10+ correct placements: that player wins
 *   - Both players have 10+ correct placements: "draw" (simultaneous win)
 *   - Neither player has 10+ correct placements: null (match continues)
 * 
 * @param {number} player1Placements - Player 1's current correct placements
 * @param {number} player2Placements - Player 2's current correct placements
 * @returns {string|null} 'player_1', 'player_2', 'draw', or null if no winner
 * @throws {Error} if placements are invalid
 */
export function determineWinnerByPlacements(player1Placements, player2Placements) {
  if (
    player1Placements === null || 
    player1Placements === undefined ||
    player2Placements === null || 
    player2Placements === undefined
  ) {
    throw new Error('Both player placements must be non-null values');
  }

  if (
    typeof player1Placements !== 'number' || 
    typeof player2Placements !== 'number' ||
    isNaN(player1Placements) || 
    isNaN(player2Placements)
  ) {
    throw new Error('Both player placements must be numbers');
  }

  if (player1Placements < 0 || player2Placements < 0) {
    throw new Error('Placements cannot be negative');
  }

  const player1Won = hasPlayerWonByPlacements(player1Placements);
  const player2Won = hasPlayerWonByPlacements(player2Placements);

  // Both players hit 10 at the same time (draw/tie situation)
  if (player1Won && player2Won) {
    return 'draw';
  }

  // Only player 1 won
  if (player1Won) {
    return 'player_1';
  }

  // Only player 2 won
  if (player2Won) {
    return 'player_2';
  }

  // Neither player has won yet
  return null;
}

/**
 * Check the win condition based on correct placements (AC requirement).
 * Returns an object with:
 *   - isWinState: boolean indicating if match should end
 *   - winner: 'player_1', 'player_2', 'draw', or null
 * 
 * @param {number} player1Placements - Player 1's current correct placements
 * @param {number} player2Placements - Player 2's current correct placements
 * @returns {Object} { isWinState: boolean, winner: string|null }
 * @throws {Error} if placements are invalid
 */
export function checkWinConditionByPlacements(player1Placements, player2Placements) {
  const winner = determineWinnerByPlacements(player1Placements, player2Placements);
  
  return {
    isWinState: winner !== null,
    winner
  };
}

export default {
  hasPlayerWon,
  determineWinner,
  checkWinCondition,
  hasPlayerWonByPlacements,
  determineWinnerByPlacements,
  checkWinConditionByPlacements,
  WIN_THRESHOLD,
  CORRECT_PLACEMENTS_THRESHOLD
};
