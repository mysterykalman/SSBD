-- Family-mode storage for Same Same but Different.
--
-- Additive and idempotent: safe on an empty project and on one where some of these
-- tables already exist. Never drops, renames or rewrites existing columns or rows.
--
-- Conventions kept from earlier releases so stored data reads back unchanged:
--   * ids are text (uuids, `${game_id}:${n}` round ids, `${game_id}:${key}:${player_id}` notification ids)
--   * timestamps are ISO-8601 text; COLLATE "C" keeps ORDER BY a plain byte-wise sort
--   * words are stored exactly as typed
--   * legacy server-side Solo games use the sentinel player id 'BOT', which has no players row,
--     so game_players.player_id and submissions.player_id deliberately have no foreign key
-- Columns added after the first release (language, rematch_of, bot_quality, bot_reason, seq)
-- are at the end of their tables so positional reads of the original columns still line up.

create table if not exists public.players (
  id            text primary key,
  display_name  text not null,
  recovery_code text not null,
  created_at    text collate "C" not null,
  last_seen_at  text collate "C" not null,
  constraint players_recovery_code_key unique (recovery_code)
);

create table if not exists public.games (
  id           text primary key,
  join_code    text not null,
  status       text not null,              -- WAITING | ACTIVE | MATCHED | EXHAUSTED | legacy COMPLETE
  round_number integer not null default 1,
  created_at   text collate "C" not null,
  updated_at   text collate "C" not null,
  language     text default 'en',
  rematch_of   text,                       -- the finished game a rematch was started from
  constraint games_join_code_key unique (join_code)
);
alter table public.games add column if not exists language text default 'en';
alter table public.games add column if not exists rematch_of text;

create table if not exists public.game_players (
  game_id   text not null references public.games (id),
  player_id text not null,                 -- no FK: legacy Solo games use 'BOT'
  slot      integer not null,              -- 1 = side a (creator), 2 = side b
  joined_at text collate "C" not null,
  constraint game_players_pkey primary key (game_id, player_id),
  constraint game_players_slot_key unique (game_id, slot)
);

create table if not exists public.rounds (
  id           text primary key,
  game_id      text not null references public.games (id),
  round_number integer not null,
  previous_a   text,
  previous_b   text,
  status       text not null,              -- OPEN | REVEALED | MATCHED | EXHAUSTED | legacy COMPLETE
  created_at   text collate "C" not null,
  revealed_at  text collate "C",
  bot_quality  text,
  bot_reason   text,
  constraint rounds_game_round_key unique (game_id, round_number)
);
alter table public.rounds add column if not exists bot_quality text;
alter table public.rounds add column if not exists bot_reason text;

create table if not exists public.submissions (
  round_id     text not null references public.rounds (id),
  player_id    text not null,              -- no FK: legacy Solo games use 'BOT'
  word         text not null,
  submitted_at text collate "C" not null,
  constraint submissions_pkey primary key (round_id, player_id)
);

create table if not exists public.notifications (
  id         text primary key,             -- deterministic: duplicates are impossible
  player_id  text not null references public.players (id),
  game_id    text references public.games (id),
  kind       text not null,
  message    text not null,
  read_at    text collate "C",
  created_at text collate "C" not null,
  seq        bigint generated always as identity  -- insertion order, the tie-breaker for equal created_at
);
alter table public.notifications add column if not exists seq bigint generated always as identity;

create index if not exists game_players_player_idx on public.game_players (player_id);
create index if not exists games_updated_idx on public.games (updated_at desc);
create index if not exists notifications_list_idx on public.notifications (player_id, created_at desc, seq desc);
create index if not exists notifications_unread_idx on public.notifications (player_id) where read_at is null;

-- Family-mode data is only reachable through the Vercel Function, which connects as the
-- database owner. RLS on with no policies, plus revoked grants, means Supabase's Data API
-- (anon / authenticated keys) can neither read nor write any of it, including words that
-- have not been revealed yet.
alter table public.players       enable row level security;
alter table public.games         enable row level security;
alter table public.game_players  enable row level security;
alter table public.rounds        enable row level security;
alter table public.submissions   enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.players, public.games, public.game_players,
                    public.rounds, public.submissions, public.notifications
  from anon, authenticated;
