CREATE TABLE IF NOT EXISTS leaderboard_entries (
  name_key TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  correct_answers INTEGER NOT NULL CHECK (correct_answers BETWEEN 0 AND 30),
  total_questions INTEGER NOT NULL DEFAULT 30 CHECK (total_questions = 30),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 0 AND 1800),
  submitted_at INTEGER NOT NULL,
  attempt_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS leaderboard_rank_idx ON leaderboard_entries (correct_answers DESC, duration_seconds ASC, submitted_at ASC);
