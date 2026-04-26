-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL COLLATE "und-x-icu",
  host_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'completed')),
  max_players INTEGER DEFAULT 2 CHECK (max_players > 0 AND max_players <= 10),
  player_count INTEGER DEFAULT 0 CHECK (player_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create case-insensitive index on code for fast lookups
CREATE INDEX idx_rooms_code ON rooms(code COLLATE "und-x-icu");

-- Ensure player_count does not exceed max_players
CREATE OR REPLACE FUNCTION check_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.player_count > NEW.max_players THEN
    RAISE EXCEPTION 'player_count cannot exceed max_players';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_player_count
  BEFORE INSERT OR UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION check_player_count();
