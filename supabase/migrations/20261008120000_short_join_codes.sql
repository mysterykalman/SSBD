-- Family room codes become exactly two uppercase letters and two digits ("AB12").
--
-- 26 × 26 × 100 = 67,600 codes, so a code only has to be unique among ACTIVE rooms (waiting for a
-- friend, or being played); a finished room frees its code. The API checks for an active clash
-- before creating a room, and this partial unique index catches two rooms racing for one code.
-- Every existing code in the old format ("ABCD-12") is rewritten, so none is shown or accepted again.
-- Idempotent: safe to run more than once.

alter table public.games drop constraint if exists games_join_code_key;

do $$
declare
  g record;
  candidate text;
begin
  for g in
    select id from public.games
    where join_code !~ '^[A-Z]{2}[0-9]{2}$'
    order by (status in ('WAITING', 'ACTIVE')) desc, created_at
  loop
    loop
      candidate := chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int) || lpad(floor(random() * 100)::int::text, 2, '0');
      exit when not exists (select 1 from public.games where join_code = candidate and status in ('WAITING', 'ACTIVE'));
    end loop;
    update public.games set join_code = candidate where id = g.id;
  end loop;
end $$;

create unique index if not exists games_active_join_code_key
  on public.games (join_code) where status in ('WAITING', 'ACTIVE');
