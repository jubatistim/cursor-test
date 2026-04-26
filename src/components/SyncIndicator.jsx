import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { syncManager, SyncState } from '../utils/syncManager';

/**
 * SyncIndicator component - Shows synchronization status for all players
 * 
 * Displays:
 * - Sync status (in sync / out of sync)
 * - Number of players in sync
 * - Visual indicator of sync quality
 */
export function SyncIndicator({ 
  totalPlayers = 0, 
  inSync = false,
  showStats = true,
  size = 'medium' 
}) {
  const [syncStatus, setSyncStatus] = useState(inSync);
  const [playerCount, setPlayerCount] = useState(totalPlayers);
  
  // Listen to sync manager updates
  useEffect(() => {
    const handleSyncChange = (stats) => {
      setSyncStatus(stats.inSync);
      setPlayerCount(stats.totalPlayers);
    };

    syncManager.setCallbacks({
      onSyncStatusChange: handleSyncChange
    });

    // Initial state
    setSyncStatus(inSync);
    setPlayerCount(totalPlayers);

    return () => {
      syncManager.setCallbacks({
        onSyncStatusChange: null
      });
    };
  }, [inSync, totalPlayers]);

  // Update when props change
  useEffect(() => {
    setSyncStatus(inSync);
    setPlayerCount(totalPlayers);
  }, [inSync, totalPlayers]);

  const getIndicatorColor = () => {
    if (syncStatus) {
      return 'sync-indicator-green';
    }
    return 'sync-indicator-red';
  };

  const getStatusText = () => {
    if (syncStatus) {
      return `✓ In Sync (${playerCount} players)`;
    }
    return `⚠ Out of Sync`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'sync-indicator-small';
      case 'large':
        return 'sync-indicator-large';
      default:
        return 'sync-indicator-medium';
    }
  };

  return (
    <div className={`sync-indicator ${getSizeClass()} ${getIndicatorColor()}`}>
      <div className="sync-icon">
        {syncStatus ? '⚡' : '⚠'}
      </div>
      {showStats && (
        <div className="sync-stats">
          <span className="sync-text">{getStatusText()}</span>
        </div>
      )}
      <style jsx>{`
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .sync-indicator-small {
          padding: 4px 8px;
          font-size: 12px;
        }
        .sync-indicator-medium {
          padding: 8px 12px;
          font-size: 14px;
        }
        .sync-indicator-large {
          padding: 12px 16px;
          font-size: 16px;
        }
        .sync-indicator-green {
          border: 2px solid #4CAF50;
        }
        .sync-indicator-red {
          border: 2px solid #f44336;
        }
        .sync-icon {
          font-size: 1.2em;
          min-width: 20px;
          text-align: center;
        }
        .sync-stats {
          display: flex;
          flex-direction: column;
        }
        .sync-text {
          font-size: 0.9em;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

SyncIndicator.propTypes = {
  totalPlayers: PropTypes.number,
  inSync: PropTypes.bool,
  showStats: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default SyncIndicator;
