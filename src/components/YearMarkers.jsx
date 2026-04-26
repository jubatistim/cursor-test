import PropTypes from 'prop-types';

/**
 * YearMarkers component - Shows decade labels on the timeline
 * Displays 1960s, 1970s, etc. markers for chronological reference
 */
export function YearMarkers({ songs = [], className = '' }) {
  // Generate decade markers based on song years
  const getDecadeMarkers = () => {
    if (songs.length === 0) {
      return ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
    }

    const years = songs.map(song => song.release_year).filter(Boolean);
    if (years.length === 0) return [];

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const startDecade = Math.floor(minYear / 10) * 10;
    const endDecade = Math.ceil(maxYear / 10) * 10;

    const markers = [];
    for (let decade = startDecade; decade <= endDecade; decade += 10) {
      markers.push(`${decade}s`);
    }

    return markers;
  };

  const markers = getDecadeMarkers();

  return (
    <div className={`year-markers ${className}`}>
      {markers.map((marker, index) => (
        <div key={marker} className="decade-marker">
          <span className="decade-label">{marker}</span>
          {index < markers.length - 1 && (
            <div className="decade-divider"></div>
          )}
        </div>
      ))}
    </div>
  );
}

YearMarkers.propTypes = {
  songs: PropTypes.arrayOf(
    PropTypes.shape({
      release_year: PropTypes.number
    })
  ),
  className: PropTypes.string
};

export default YearMarkers;