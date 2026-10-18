-- Spec 08, migration 3: the database refuses timetable clashes, with the same rules as src/lib/conflicts.ts.
-- A clash is the same group, room or instructor, on the same day, at overlapping hours, in weeks that can coincide.

alter table public.zajecia
  -- Half-open, so classes that only touch (10:00–12:00, 12:00–14:00) don't overlap.
  -- Guarded so that start >= end is reported by zajecia_godziny_check, not by the range constructor
  -- (generated columns are computed before check constraints run).
  add column czas public.timerange
    generated always as (
      case when godzina_od < godzina_do then public.timerange(godzina_od, godzina_do, '[)') end
    ) stored,
  -- Weekly classes cover both week kinds; even and odd weeks never overlap each other.
  add column tygodnie int4range
    generated always as (
      case powtarzalnosc
        when 'parzyste' then int4range(0, 1)
        when 'nieparzyste' then int4range(1, 2)
        else int4range(0, 2)
      end
    ) stored;

-- Constraint names are stable: the app maps them to Polish conflict messages (spec 11).
alter table public.zajecia
  add constraint zajecia_grupa_bez_kolizji
    exclude using gist (grupa_id with =, dzien with =, czas with &&, tygodnie with &&),
  add constraint zajecia_sala_bez_kolizji
    exclude using gist (lower(btrim(sala)) with =, dzien with =, czas with &&, tygodnie with &&),
  add constraint zajecia_prowadzacy_bez_kolizji
    exclude using gist (prowadzacy_id with =, dzien with =, czas with &&, tygodnie with &&);
