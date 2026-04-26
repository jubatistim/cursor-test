-- Matches and Game States tables for Story 1.3: Start Match

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  current_round INTEGER DEFAULT 1 CHECK (current_round > 0),
  max_score INTEGER DEFAULT 10 CHECK (max_score > 0 AND max_score <= 100),
  winner_id UUID REFERENCES players(id)
);

-- Create index for matches(room_id) for fast lookups
CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);

-- Create index for matches(status) 
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Create game_states table
CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0 CHECK (score >= 0),
  correct_placements INTEGER DEFAULT 0 CHECK (correct_placements >= 0),
  timeline JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

-- Create index for game_states(match_id) for fast lookups
CREATE INDEX IF NOT EXISTS idx_game_states_match_id ON game_states(match_id);

-- Add current_match_id column to rooms table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'current_match_id'
  ) THEN
    ALTER TABLE rooms ADD COLUMN current_match_id UUID REFERENCES matches(id);
  END IF;
END $$;

-- Create trigger to update room's current_match_id when match is created
CREATE OR REPLACE FUNCTION update_room_current_match()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms 
    SET current_match_id = NEW.id, status = 'playing'
    WHERE id = NEW.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_current_match_on_insert ON matches;

CREATE TRIGGER trigger_update_room_current_match_on_insert
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION update_room_current_match();

-- Create trigger to update room status when match ends
CREATE OR REPLACE FUNCTION update_room_status_on_match_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' THEN
    UPDATE rooms 
    SET status = 'completed'
    WHERE id = NEW.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_status_on_match_end ON matches;

CREATE TRIGGER trigger_update_room_status_on_match_end
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (OLD.status <> NEW.status AND NEW.status = 'ended')
  EXECUTE FUNCTION update_room_status_on_match_end();
