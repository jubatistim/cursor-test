import PropTypes from 'prop-types';
import { formatTime, getCountdownValue } from '../utils/audioPlayer';

/**
 * RoundInfo component - Displays round information during gameplay
 * 
 * Shows:
 * - Current round number
 * - Countdown timer for the snippet
 * - Visual indicator that audio is playing
 */
export function RoundInfo({ 
  roundNumber = 1,
  totalRounds = 10,
  isPlaying = false,
  snippetStartTime = null,
  snippetDuration = 20,
  showSongInfo = false,
  songTitle = '',
  songArtist = '' 
}) {
  // Calculate countdown value if playing
  const countdownValue = isPlaying && snippetStartTime
    ? getCountdownValue(snippetStartTime, snippetDuration)
    : 0;

  return (
    <div className="round-info">
      <div className="round-header">
        <span className="round-label">Round</span>
        <span className="round-number">{roundNumber}</span>
        {totalRounds > 0 && (
          <span className="round-total"> / {totalRounds}</span>
        )}
      </div>

      {isPlaying && (
        <div className="playing-indicator">
          <span className="pulse">●</span>
          <span>Playing</span>
        </div>
      )}

      {/* Countdown timer */}
      {isPlaying && snippetStartTime && (
        <div className="countdown-display">
          <span className="countdown-label">Time left:</span>
          <span className="countdown-value">
            {formatTime(countdownValue)}
          </span>
        </div>
      )}

      {/* Song information (optional) */}
      {showSongInfo && (songTitle || songArtist) && (
        <div className="song-info-display">
          {songTitle && <p className="current-song-title">{songTitle}</p>}
          {songArtist && <p className="current-song-artist">by {songArtist}</p>}
        </div>
      )}

      {!isPlaying && !countdownValue && (
        <div className="waiting-message">
          <p>Waiting for round to start...</p>
        </div>
      )}
    </div>
  );
}

RoundInfo.propTypes = {
  roundNumber: PropTypes.number,
  totalRounds: PropTypes.number,
  isPlaying: PropTypes.bool,
  snippetStartTime: PropTypes.number,
  snippetDuration: PropTypes.number,
  showSongInfo: PropTypes.bool,
  songTitle: PropTypes.string,
  songArtist: PropTypes.string
};

export default RoundInfo;
