-- Add players table and update rooms table for Story 1.2: Join Room

-- Add player_count column to rooms table
ALTER TABLE rooms ADD COLUMN player_count INTEGER DEFAULT 0;

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_number)
);

-- Create index for room lookups by code (already exists from 0000_create_rooms.sql)
-- CREATE INDEX idx_rooms_code ON rooms(code);