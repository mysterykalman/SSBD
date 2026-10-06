CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, recovery_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, join_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, round_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en');
CREATE TABLE IF NOT EXISTS game_players (game_id TEXT NOT NULL, player_id TEXT NOT NULL, slot INTEGER NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(game_id, player_id), UNIQUE(game_id, slot));
CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, round_number INTEGER NOT NULL, previous_a TEXT, previous_b TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, revealed_at TEXT, UNIQUE(game_id, round_number));
CREATE TABLE IF NOT EXISTS submissions (round_id TEXT NOT NULL, player_id TEXT NOT NULL, word TEXT NOT NULL, submitted_at TEXT NOT NULL, PRIMARY KEY(round_id, player_id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, game_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_gp_player ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id, read_at, created_at);

