-- The player's 1–5 star rating of a won Solo game (asked once, inline on the win screen).
-- Additive and idempotent. Written once by the server (POST /api/log/batch), never overwritten.
-- Until this is applied, games and rounds still log normally; ratings stay queued on each device
-- and upload once the column exists.

alter table public.bot_games add column if not exists player_rating smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bot_games_player_rating_range') then
    alter table public.bot_games add constraint bot_games_player_rating_range check (player_rating is null or player_rating between 1 and 5);
  end if;
end $$;
