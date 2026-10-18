-- Spec 08, migration 1: extensions, enum types, a time range type, and API default privileges.

-- btree_gist lets the exclusion constraints in `zajecia_conflicts` combine `=` on scalar columns with `&&` on ranges.
create extension if not exists btree_gist with schema extensions;

-- Tables are exposed to the Data API only through explicit grants (see `api_grants_and_rls`), never by default.
-- This matches Supabase's change "Tables not exposed to Data and GraphQL API automatically" and keeps the local
-- stack and the cloud project behaving the same way.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

create type public.tryb_studiow as enum ('stacjonarne', 'niestacjonarne');

create type public.typ_zajec as enum ('wyklad', 'cwiczenia', 'laboratorium', 'seminarium');

create type public.powtarzalnosc as enum ('co-tydzien', 'parzyste', 'nieparzyste');

create type public.tytul_naukowy as enum ('mgr', 'mgr inż.', 'dr', 'dr inż.', 'dr hab.', 'prof.');

-- Hours of a class as a range, so overlaps can be checked with `&&` (half-open: 10:00–12:00 and 12:00–14:00 don't overlap).
create type public.timerange as range (subtype = time);
