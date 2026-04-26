-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  max_players INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX idx_rooms_code ON rooms(code);
