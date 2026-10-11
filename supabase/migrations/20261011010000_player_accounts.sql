-- Lightweight player accounts for cross-device identity.
-- PINs are never stored directly; the application stores a salted scrypt hash.

alter table public.players add column if not exists username text;
alter table public.players add column if not exists pin_hash text;
alter table public.players add column if not exists failed_login_count integer not null default 0;
alter table public.players add column if not exists login_locked_until text collate "C";

create unique index if not exists players_username_lower_key
  on public.players (lower(username))
  where username is not null;
