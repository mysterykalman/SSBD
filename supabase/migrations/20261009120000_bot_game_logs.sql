-- Solo bot evaluation logs: one row per Solo game (Gary or Milo) and one row per revealed round,
-- plus human review flags. Used to evaluate how the bot reached each decision, not only whether
-- the game was won.
--
-- Additive and idempotent. No player names, emails or IP addresses are stored: games are keyed by
-- the game's own random id. Rounds are written only after they are revealed (never an unrevealed
-- word). Timestamps are ISO-8601 text (COLLATE "C"), like the family-game tables.

create table if not exists public.bot_games (
  game_id          text primary key,
  mode             text not null default 'solo',
  character        text not null,
  language         text not null,
  started_at       text collate "C" not null,
  last_activity_at text collate "C" not null,
  ended_at         text collate "C",
  status           text not null,            -- in_progress | matched | exhausted | ended (abandoned is inferred at read time)
  rounds           integer not null default 0,
  app_version      text,
  engine_version   text,
  dataset_version  text,
  config           jsonb,
  seed             bigint,
  received_at      text collate "C" not null
);

create table if not exists public.bot_rounds (
  game_id        text not null references public.bot_games (game_id) on delete cascade,
  round          integer not null,
  pair_a         text,                       -- the latest revealed pair the bot answered (null on move 1)
  pair_b         text,
  user_word      text not null,
  bot_word       text not null,
  user_key       text not null,              -- normalised (the game's wordKey)
  bot_key        text not null,
  matched        boolean not null,
  revealed_at    text collate "C" not null,
  decision_ms    real,
  stage          text,
  low_quality    boolean,
  decision       jsonb,                      -- the engine's structured decision record
  received_at    text collate "C" not null,
  primary key (game_id, round),
  constraint bot_rounds_round_check check (round between 1 and 20)
);
create index if not exists bot_games_started_idx on public.bot_games (started_at desc);

create table if not exists public.bot_reviews (
  game_id     text not null,
  round       integer not null,
  flags       text[] not null default '{}',  -- weak | one-sided | obscure | generic | good
  note        text,
  reviewed_at text collate "C" not null,
  primary key (game_id, round),
  foreign key (game_id, round) references public.bot_rounds (game_id, round) on delete cascade
);

-- Only the Vercel Function (database owner) can read or write these tables; the review screen goes
-- through it with a server-side review token. Supabase's Data API keys get nothing.
alter table public.bot_games   enable row level security;
alter table public.bot_rounds  enable row level security;
alter table public.bot_reviews enable row level security;
revoke all on table public.bot_games, public.bot_rounds, public.bot_reviews from anon, authenticated;
