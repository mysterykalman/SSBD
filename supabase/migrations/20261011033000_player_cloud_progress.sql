-- Lightweight cross-device recovery for Solo and Mom Mode.
-- Together already lives in normalized server tables; this JSON keeps device-first
-- modes recoverable without forcing an account system.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS cloud_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN players.cloud_progress IS
  'Opaque device-first progress for recoverable Solo games and Mom Mode progression.';
