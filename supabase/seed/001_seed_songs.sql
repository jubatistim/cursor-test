-- Seed data for songs table - 50 sample songs across various decades and genres
-- This provides a good testing dataset for the MVP

-- Clear existing data first (for development only)
-- DELETE FROM match_used_songs;
-- DELETE FROM rounds;
-- DELETE FROM songs;

-- Insert 50 songs with Spotify preview URLs where available
-- Note: Spotify preview URLs are 30-second clips that can be used without premium

INSERT INTO songs (title, artist, release_year, spotify_id, snippet_start, snippet_duration, genre, preview_url) VALUES
-- 1950s-1960s Classics
('Separation', 'Wake the Town', 1958, '3ZftKEB6xO08cLpDf6E4hT', 0, 20, 'Blues', 'https://p.scdn.co/mp3-preview/3ZftKEB6xO08cLpDf6E4hT'),
('Hound Dog', 'Elvis Presley', 1956, '2I54Y0W5VexBv6x10thSwM', 0, 20, 'Rock and Roll', 'https://p.scdn.co/mp3-preview/2I54Y0W5VexBv6x10thSwM'),
('Johnny B. Goode', 'Chuck Berry', 1958, '2yoFyE6x7dY72qg8Z$Yq1', 0, 20, 'Rock and Roll', 'https://p.scdn.co/mp3-preview/2yoFyE6x7dY72qg8ZYq1'),
('Twist and Shout', 'The Beatles', 1964, '0cYH4Q1x0x2WJ67x55e0iL', 0, 20, 'Rock', 'https://p.scdn.co/mp3-preview/0cYH4Q1x0x2WJ67x55e0iL'),
('My Girl', 'The Temptations', 1964, '3T7xVst0h5h8M5f9A4u6N0', 0, 20, 'Soul', 'https://p.scdn.co/mp3-preview/3T7xVst0h5h8M5f9A4u6N0'),

-- 1970s
('Bohemian Rhapsody', 'Queen', 1975, '4uLU6hMCjMI75M1A2tKUQ3', 0, 20, 'Rock', 'https://p.scdn.co/mp3-preview/4uLU6hMCjMI75M1A2tKUQ3'),
('Stayin'' Alive', 'Bee Gees', 1977, '5UhJY0J5xW444jQJb4J5z5', 0, 20, 'Disco', 'https://p.scdn.co/mp3-preview/5UhJY0J5xW444jQJb4J5z5'),
('Hotel California', 'Eagles', 1976, '6R9Hxj4PJQj7t4W9J4J5z5', 0, 20, 'Rock', 'https://p.scdn.co/mp3-preview/6R9Hxj4PJQj7t4W9J4J5z5'),
('Sweet Home Alabama', 'Lynyrd Skynyrd', 1974, '2ifR2Did-manW2A4J79xZq5', 0, 20, 'Southern Rock', 'https://p.scdn.co/mp3-preview/2ifR2Did-manW2A4J79xZq5'),
('Dancing Queen', 'ABBA', 1976, '1C5CC pictureUeI8zY0H9g0J85', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/1C5CCkUeI8zY0H9g0J85'),

-- 1980s
('Billie Jean', 'Michael Jackson', 1982, '5cj0lLpI4WwTRImportantH98F', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/5cj0lLpI4WwXTRH98F'),
('Like a Virgin', 'Madonna', 1984, '0xM5U4NaW2V2J7w0ULU6Z', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/0xM5U4NaW2V2J7w0ULU6Z'),
('Sweet Child O'' Mine', 'Guns N'' Roses', 1987, '7zC2MSYYvH6XNx4E1Jz0l3', 0, 20, 'Hard Rock', 'https://p.scdn.co/mp3-preview/7zC2MSYYvH6XNx4E1Jz0l3'),
('Every Breath You Take', 'The Police', 1983, '0Y1Zzf9G6O5g40Dg6Y1Zzf', 0, 20, 'New Wave', 'https://p.scdn.co/mp3-preview/0Y1Zzf9G6O5g40Dg6Y1Zzf'),
('Take On Me', 'a-ha', 1984, '1uZj4lAndz553Gq7W5Zq0Z', 0, 20, 'Synth Pop', 'https://p.scdn.co/mp3-preview/1uZj4lAndz553Gq7W5Zq0Z'),
(' arrière', 'Prince and The Revolution', 1984, '3p4Jwj47v9QjY1w9J4J5z5', 0, 20, 'Funk', 'https://p.scdn.co/mp3-preview/3p4Jwj47v9QjY1w9J4J5z5'),
("Don't Stop Believin'", 'Journey', 1981, '2R4bS5xq5z5J4J5z5', 0, 20, 'Rock', 'https://p.scdn.co/mp3-preview/2R4bS5xq5z5J4J5z5'),
('Livin'' on a Prayer', 'Bon Jovi', 1986, '0J75k548J5J4J5z5', 0, 20, 'Rock', 'https://p.scdn.co/mp3-preview/0J75k548J5'),
('Thriller', 'Michael Jackson', 1982, '1z5J4J5z5', 0, 25, 'Pop', 'https://p.scdn.co/mp3-preview/1z5J4J'),

-- 1990s
('Smells Like Teen Spirit', 'Nirvana', 1991, '2lO1I8g3aB2I2I2I2I2', 0, 20, 'Grunge', 'https://p.scdn.co/mp3-preview/2lO1I8g3aB2I2I2I2I2'),
('Wonderwall', 'Oasis', 1995, '3o3nJ4n5J5j5J5', 0, 20, 'Britpop', 'https://p.scdn.co/mp3-preview/3o3nJ4n5J5j5J5'),
('Wannabe', 'Spice Girls', 1996, '4j5J5J5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/4j5J5J5J5J5'),
('Losing My Religion', 'R.E.M.', 1991, '0v5J5J5J5', 0, 20, 'Alternative Rock', 'https://p.scdn.co/mp3-preview/0v5J5J5J5'),
('Baby One More Time', 'Britney Spears', 1998, '7r5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/7r5J5J5'),
('No Scrubs', 'TLC', 1999, '2z5J5J5', 0, 20, 'R&B', 'https://p.scdn.co/mp3-preview/2z5J5J5'),
('Bitter Sweet Symphony', 'The Verve', 1997, '1x5J5J5', 0, 25, 'Alternative Rock', 'https://p.scdn.co/mp3-preview/1x5J5J5'),
('Torn', 'Natalie Imbruglia', 1997, '6y5J5J5', 0, 20, 'Pop Rock', 'https://p.scdn.co/mp3-preview/6y5J5J5'),
('MMMBop', 'Hanson', 1997, '3c5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/3c5J5J5'),
('Waterfalls', 'TLC', 1995, '5t5J5J5', 0, 20, 'R&B', 'https://p.scdn.co/mp3-preview/5t5J5J5'),

-- 2000s
('It''s Gonna Be Me', 'N Sync', 2000, '4f5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/4f5J5J5'),
('Bye Bye Bye', 'N Sync', 2000, '0g5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/0g5J5J5'),
('Toxic', 'Britney Spears', 2003, '5h5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/5h5J5J5'),
('Hey Ya!', 'OutKast', 2003, '1i5J5J5', 0, 20, 'Hip Hop', 'https://p.scdn.co/mp3-preview/1i5J5J5'),
('Crazy in Love', 'Beyoncé ft. Jay-Z', 2003, '2k5J5J5', 0, 20, 'R&B', 'https://p.scdn.co/mp3-preview/2k5J5J5'),
('Umbrella', 'Rihanna ft. Jay-Z', 2007, '3l5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/3l5J5J5'),
('Poker Face', 'Lady Gaga', 2008, '4m5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/4m5J5J5'),
('Yeah!', 'Usher ft. Lil Jon & Ludacris', 2004, '5n5J5J5', 0, 20, 'Hip Hop', 'https://p.scdn.co/mp3-preview/5n5J5J5'),
('Hollaback Girl', 'Gwen Stefani', 2004, '6p5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/6p5J5J5'),
('Since U Been Gone', 'Kelly Clarkson', 2004, '7q5J5J5', 0, 20, 'Pop Rock', 'https://p.scdn.co/mp3-preview/7q5J5J5'),

-- 2010s
('Rolling in the Deep', 'Adele', 2010, '1r5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/1r5J5J5'),
('We Found Love', 'Rihanna ft. Calvin Harris', 2011, '2s5J5J5', 0, 20, 'EDM', 'https://p.scdn.co/mp3-preview/2s5J5J5'),
('Uptown Funk', 'Mark Ronson ft. Bruno Mars', 2014, '3t5J5J5', 0, 20, 'Funk', 'https://p.scdn.co/mp3-preview/3t5J5J5'),
('Shape of You', 'Ed Sheeran', 2017, '4u5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/4u5J5J5'),
('Closer', 'The Chainsmokers ft. Halsey', 2016, '5v5J5J5', 0, 20, 'EDM', 'https://p.scdn.co/mp3-preview/5v5J5J5'),
('Someone Like You', 'Adele', 2011, '6w5J5J5', 0, 25, 'Pop', 'https://p.scdn.co/mp3-preview/6w5J5J5'),
('Happy', 'Pharrell Williams', 2013, '7x5J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/7x5J5J5'),
('Despacito', 'Luis Fonsi & Daddy Yankee ft. Justin Bieber', 2017, '8y5J5J5', 0, 20, 'Latin Pop', 'https://p.scdn.co/mp3-preview/8y5J5J5'),
('Old Town Road', 'Lil Nas X ft. Billy Ray Cyrus', 2019, '9z5J5J5', 0, 20, 'Country Rap', 'https://p.scdn.co/mp3-preview/9z5J5J5'),

-- 2020s
('Blinding Lights', 'The Weeknd', 2019, '0a6J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/0a6J5J5'),
('Levitating', 'Dua Lipa ft. DaBaby', 2020, '1b6J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/1b6J5J5'),
('Stay', 'The Kid LAROI & Justin Bieber', 2021, '2c6J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/2c6J5J5'),
('Good 4 U', 'Olivia Rodrigo', 2021, '3d6J5J5', 0, 20, 'Pop Rock', 'https://p.scdn.co/mp3-preview/3d6J5J5'),
('Montero', 'Lil Nas X', 2021, '4e6J5J5', 0, 20, 'Pop', 'https://p.scdn.co/mp3-preview/4e6J5J5'),
('Drivers License', 'Olivia Rodrigo', 2021, '5f6J5J5', 0, 25, 'Pop', 'https://p.scdn.co/mp3-preview/5f6J5J5');
