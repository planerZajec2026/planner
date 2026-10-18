-- Spec 08: the database refuses timetable clashes (same rules as src/lib/conflicts.ts). Runs against the seed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Inserts a class; the test cases below differ only in the values that matter for each rule.
create function pg_temp.dodaj(
  p_grupa text, p_prowadzacy text, p_dzien int, p_od text, p_do text, p_sala text,
  p_powtarzalnosc text default 'co-tydzien', p_przedmiot text default 'Bazy danych'
) returns void language sql as $$
  insert into public.zajecia (przedmiot_id, typ, prowadzacy_id, grupa_id, dzien, godzina_od, godzina_do, sala, powtarzalnosc)
  select id, 'wyklad', p_prowadzacy, p_grupa, p_dzien, p_od::time, p_do::time, p_sala, p_powtarzalnosc::public.powtarzalnosc
  from public.przedmioty where nazwa = p_przedmiot;
$$;

-- The design's JSON sample duplicates "Bazy danych", B21, Friday 18:00–20:00 for INF/Z-3.
select throws_matching(
  $$ select pg_temp.dodaj('inf-z-3', 'e-kaminska', 5, '18:00', '20:00', 'B21') $$,
  'zajecia_(grupa|sala|prowadzacy)_bez_kolizji',
  'the design sample is rejected as a clash'
);

-- Room only (Monday 10–12 in B21 is taken by INF-2A); case and spaces don't matter.
select throws_matching(
  $$ select pg_temp.dodaj('eko-3a', 'm-nowak', 1, '11:00', '12:30', ' b21 ') $$,
  'zajecia_sala_bez_kolizji',
  'same room at overlapping hours is rejected'
);

-- Instructor only (dr Zieliński teaches Tuesday 14–16).
select throws_matching(
  $$ select pg_temp.dodaj('eko-3a', 'p-zielinski', 2, '15:00', '17:00', 'Z1') $$,
  'zajecia_prowadzacy_bez_kolizji',
  'same instructor at overlapping hours is rejected'
);

-- Group only (INF/Z-3 has English on Sunday 8–10).
select throws_matching(
  $$ select pg_temp.dodaj('inf-z-3', 'm-nowak', 7, '09:00', '09:30', 'Z1') $$,
  'zajecia_grupa_bez_kolizji',
  'same group at overlapping hours is rejected'
);

-- Touching is fine: INF/Z-3's Saturday ends at 18:00.
select lives_ok(
  $$ select pg_temp.dodaj('inf-z-3', 'm-nowak', 6, '18:00', '19:00', 'Z1') $$,
  'a class starting when another ends is allowed'
);

-- Parity: INF-2A has an even-week lab on Wednesday 10–12.
select lives_ok(
  $$ select pg_temp.dodaj('inf-2a', 'a-krupa', 3, '10:00', '12:00', 'Z2', 'nieparzyste') $$,
  'odd weeks do not clash with even weeks'
);
select throws_matching(
  $$ select pg_temp.dodaj('inf-2a', 'm-sobolewski', 3, '10:30', '11:30', 'Z3', 'parzyste') $$,
  'zajecia_grupa_bez_kolizji',
  'even weeks clash with even weeks'
);
select throws_matching(
  $$ select pg_temp.dodaj('inf-2a', 'm-sobolewski', 3, '10:30', '11:30', 'Z3', 'co-tydzien') $$,
  'zajecia_grupa_bez_kolizji',
  'weekly classes clash with even-week classes'
);

-- Plain checks
select throws_ok(
  $$ select pg_temp.dodaj('eko-3a', 'm-nowak', 2, '12:00', '10:00', 'Z1') $$,
  '23514', null, 'start must be before end'
);
select throws_ok(
  $$ select pg_temp.dodaj('eko-3a', 'm-nowak', 8, '10:00', '12:00', 'Z1') $$,
  '23514', null, 'day must be 1–7'
);
select throws_ok(
  $$ select pg_temp.dodaj('eko-3a', 'm-nowak', 2, '10:00', '12:00', '   ') $$,
  '23514', null, 'room must not be blank'
);

select * from finish();
rollback;
