-- Add players table and update rooms table for Story 1.2: Join Room

-- Add player_count column to rooms table if it doesn't exist
-- Note: Already added in 0000_create_rooms.sql with constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'player_count'
  ) THEN
    ALTER TABLE rooms ADD COLUMN player_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number >= 1 AND player_number <= 10),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_number)
);

-- Add index on players(room_id) for fast queries
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);

-- Create trigger to sync player_count with actual player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms 
    SET player_count = (SELECT COUNT(*) FROM players WHERE room_id = NEW.room_id)
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rooms 
    SET player_count = (SELECT COUNT(*) FROM players WHERE room_id = OLD.room_id)
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_player_count_on_insert ON players;
DROP TRIGGER IF EXISTS trigger_update_room_player_count_on_delete ON players;

CREATE TRIGGER trigger_update_room_player_count_on_insert
  AFTER INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

CREATE TRIGGER trigger_update_room_player_count_on_delete
  AFTER DELETE ON players
  FOR EACH ROW EXECUTE FUNCTION update_room_player_count();