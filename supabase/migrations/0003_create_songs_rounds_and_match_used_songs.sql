-- Songs, Rounds, and Match Used Songs tables for Story 2.1: Play Song Snippet

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  release_year INTEGER NOT NULL,
  spotify_id VARCHAR(255),
  snippet_start INTEGER NOT NULL DEFAULT 0,
  snippet_duration INTEGER NOT NULL DEFAULT 20 CHECK (snippet_duration >= 15 AND snippet_duration <= 30),
  genre VARCHAR(100),
  preview_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for songs(release_year) for fast lookups
CREATE INDEX IF NOT EXISTS idx_songs_release_year ON songs(release_year);

-- Create index for songs(artist) 
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);

-- Create index for songs(genre)
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);

-- Create rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  song_id UUID NOT NULL REFERENCES songs(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  UNIQUE(match_id, round_number)
);

-- Create index for rounds(match_id) for fast lookups
CREATE INDEX IF NOT EXISTS idx_rounds_match ON rounds(match_id);

-- Create index for rounds(status)
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);

-- Create match_used_songs table to track which songs have been used in each match
CREATE TABLE IF NOT EXISTS match_used_songs (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id),
  round_number INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (match_id, song_id)
);

-- Create index for match_used_songs(match_id) for fast lookups
CREATE INDEX IF NOT EXISTS idx_match_used_songs_match ON match_used_songs(match_id);

-- Add snippet_duration validation trigger
CREATE OR REPLACE FUNCTION validate_snippet_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.snippet_duration < 15 OR NEW.snippet_duration > 30 THEN
    RAISE EXCEPTION 'snippet_duration must be between 15 and 30 seconds';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_snippet_duration ON songs;

CREATE TRIGGER trigger_validate_snippet_duration
  BEFORE INSERT OR UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION validate_snippet_duration();
