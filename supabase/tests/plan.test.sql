-- Spec 13: generator tables, seeded input data, constraints, API grants and the meetings view.
begin;
create extension if not exists pgtap with schema extensions;
select plan(72);

-- Tables
select has_table('public', t, format('table %s exists', t))
from unnest(array[
  'sloty', 'kalendarz', 'sale', 'roczniki', 'grupy_plan', 'studenci', 'studenci_grupy', 'kolizje_grup',
  'prowadzacy_plan', 'przedmioty_plan', 'zajecia_plan', 'zajecia_plan_grupy', 'zajecia_plan_prowadzacy',
  'blokady_stale', 'rada_wydzialu', 'dezyderaty_terminy', 'dezyderaty_ogolne', 'dezyderaty_sale',
  'generation_jobs', 'plan_zajec'
]) as t;

-- Seeded input data matches requirements/dane_planu.json
select is((select count(*)::int from public.zajecia_plan), 174, '174 classes to schedule');
select is((select count(*)::int from public.sale), 55, '55 rooms');
select is((select count(*)::int from public.prowadzacy_plan), 50, '50 instructors');
select is((select count(*)::int from public.grupy_plan), 51, '51 groups');
select is((select count(*)::int from public.sloty), 12, '12 slots');
select is((select count(*)::int from public.kalendarz), 84, '84 calendar days');
select is((select count(*)::int from public.studenci_grupy), 1126, '1126 student-group memberships');
select is((select count(*)::int from public.kolizje_grup), 173, '173 clashing group pairs');
select is((select count(*)::int from public.dezyderaty_terminy), 288, '288 excluded hours');

-- Every plan day occurs exactly 14 times.
select is(
  (select array_agg(n order by plan_dnia) from (
     select plan_dnia, count(*)::int as n from public.kalendarz where plan_dnia is not null group by plan_dnia
   ) s),
  array[14, 14, 14, 14, 14],
  'each plan day occurs 14 times'
);

-- The group clash table agrees with the student memberships it was derived from.
select is(
  (select count(*)::int from (
     select least(a.grupa_id, b.grupa_id) as ga, greatest(a.grupa_id, b.grupa_id) as gb
     from public.studenci_grupy a
     join public.studenci_grupy b on a.student_id = b.student_id and a.grupa_id < b.grupa_id
     group by 1, 2
   ) wyliczone),
  (select count(*)::int from public.kolizje_grup where grupa_a <> grupa_b),
  'kolizje_grup matches studenci_grupy'
);

-- Constraints
select throws_ok(
  $$insert into public.sale (id, budynek, typ, pojemnosc) values ('X1', 'A', 'sala_dydaktyczna', 0)$$,
  '23514', null, 'a room needs a positive capacity'
);
select throws_ok(
  $$insert into public.sale (id, budynek, typ, dostepna_do_planowania) values ('X2', 'A', 'sala_dydaktyczna', true)$$,
  '23514', null, 'a room available for planning needs a known capacity'
);
select lives_ok(
  $$insert into public.sale (id, budynek, typ, dostepna_do_planowania) values ('X3', 'A', 'pracownia_specjalistyczna', false)$$,
  'an unavailable room may have an unknown capacity'
);
select throws_ok(
  $$insert into public.kalendarz (data, dzien_tygodnia, typ_dnia) values ('2027-02-01', 'poniedziałek', 'zajecia')$$,
  '23514', null, 'a teaching day needs a plan day and week number'
);
select throws_ok(
  $$insert into public.kalendarz (data, dzien_tygodnia, typ_dnia, plan_dnia, nr_tygodnia) values ('2027-02-02', 'wtorek', 'zajecia', 1, 1)$$,
  '23505', null, 'a plan day occurrence is unique'
);
select throws_ok(
  $$insert into public.dezyderaty_terminy (prowadzacy_id, dzien, slot, typ) values ('P01', 1, 13, 'wykluczony')$$,
  '23514', null, 'slot must be 1-12'
);
select throws_ok(
  $$insert into public.zajecia_plan (id, rocznik_id, przedmiot_id, forma, liczba_studentow, liczba_spotkan,
      sloty_na_spotkanie, czestotliwosc, tydzien_od, tydzien_do, tryb, powiazanie)
    values ('ZX', 'INF1-R1', 'PRZ-INF1-R1-01', 'W', 10, 14, 2, 'co_tydzien', 1, 14, 'stacjonarny', 'POW-X')$$,
  '23514', null, 'a link id needs a link type'
);
select throws_ok(
  $$insert into public.generation_jobs (status, blad) values ('done', 'boom')$$,
  '23514', null, 'only failed jobs carry an error'
);

-- Generated plan: insert a job and one placement, then read it back through the meetings view.
insert into public.generation_jobs (id, status) values ('00000000-0000-0000-0000-000000000001', 'done');

select throws_ok(
  $$insert into public.plan_zajec (job_id, zajecia_id, dzien, slot, sala_id, tygodnie)
    values ('00000000-0000-0000-0000-000000000001', 'Z001', 3, 3, 'A281', array[15]::smallint[])$$,
  '23514', null, 'weeks must be 1-14'
);

insert into public.plan_zajec (job_id, zajecia_id, dzien, slot, sala_id, tygodnie)
values (
  '00000000-0000-0000-0000-000000000001', 'Z001', 3, 3, 'A281',
  array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]::smallint[]
);

select throws_ok(
  $$insert into public.plan_zajec (job_id, zajecia_id, dzien, slot, sala_id, tygodnie)
    values ('00000000-0000-0000-0000-000000000001', 'Z001', 4, 1, 'A281', array[1]::smallint[])$$,
  '23505', null, 'one placement per class and job'
);

select is(
  (select count(*)::int from public.plan_spotkania where zajecia_id = 'Z001'),
  14,
  'a weekly class has 14 meetings'
);
select is(
  (select data from public.plan_spotkania where zajecia_id = 'Z001' and nr_tygodnia = 11),
  date '2027-01-08',
  'Wednesday week 11 is Friday 8 January (make-up day)'
);
select is(
  (select data from public.plan_spotkania where zajecia_id = 'Z001' and nr_tygodnia = 14),
  date '2027-01-26',
  'Wednesday week 14 is Tuesday 26 January (make-up day)'
);
select is(
  (select slot_do::int from public.plan_spotkania where zajecia_id = 'Z001' and nr_tygodnia = 1),
  4,
  'a 2-slot class starting at slot 3 ends at slot 4'
);

-- API grants: anon reads everything and writes nothing; service_role writes.
select ok(has_table_privilege('anon', format('public.%I', t), 'select'), format('anon can select %s', t))
from unnest(array['sale', 'zajecia_plan', 'generation_jobs', 'plan_zajec', 'kalendarz']) as t;

select ok(
  not has_table_privilege('anon', format('public.%I', t), 'insert')
  and not has_table_privilege('anon', format('public.%I', t), 'update')
  and not has_table_privilege('anon', format('public.%I', t), 'delete'),
  format('anon cannot write %s', t)
)
from unnest(array['sale', 'zajecia_plan', 'generation_jobs', 'plan_zajec', 'kalendarz']) as t;

select ok(has_table_privilege('service_role', 'public.plan_zajec', 'insert'), 'service_role can write plan_zajec');
select ok(has_table_privilege('anon', 'public.plan_spotkania', 'select'), 'anon can read the meetings view');
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.plan_spotkania'::regclass),
  'the meetings view runs with the caller''s rights'
);

-- Every table in public has RLS, including tables added later.
select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null,
  'no table in public is without row level security'
);

-- The settings row is public to read and closed to writes through the API.
select ok(has_table_privilege('anon', 'public.ustawienia', 'select'), 'anon can read ustawienia');
select ok(not has_table_privilege('anon', 'public.ustawienia', 'update'), 'anon cannot update ustawienia');

-- wgraj_dane_planu: only service_role may call it.
select ok(not has_function_privilege('anon', 'public.wgraj_dane_planu(jsonb)', 'execute'), 'anon cannot load data');
select ok(not has_function_privilege('authenticated', 'public.wgraj_dane_planu(jsonb)', 'execute'), 'authenticated cannot load data');
select ok(has_function_privilege('service_role', 'public.wgraj_dane_planu(jsonb)', 'execute'), 'service_role can load data');

-- Loading replaces the input data and drops the generated plans, all in one transaction.
select is(
  (select public.wgraj_dane_planu($json$
    {"sloty": [{"slot": 1, "od": "8:15", "do": "9:00"}],
     "kalendarz": [{"data": "2027-01-04", "dzien_tygodnia": "poniedziałek", "typ_dnia": "zajęcia", "plan_dnia": 1, "nr_tygodnia": 1, "opis": ""}],
     "sale": [{"id": "T1", "nazwa": null, "budynek": "A", "typ": "sala_dydaktyczna", "pojemnosc": 30, "pojemnosc_szacowana": false, "metraz_m2": null, "wyposazenie": ["projektor"], "przeznaczenie": null, "dostepna_do_planowania": true, "uwagi": null}],
     "prowadzacy": [{"id": "PT", "stopien": "dr", "nazwa": "dr PT", "jednostka": "WFiIS", "czlonek_rady_wydzialu": false}],
     "roczniki": [{"id": "R1", "kierunek": "Informatyka", "stopien_studiow": "I", "rok": 1, "semestr": 1, "nazwa": "Rocznik 1", "liczba_studentow": 10, "syntetyczny": false}],
     "grupy": [{"id": "R1-ALL", "rocznik": "R1", "nazwa": "Cały rocznik", "typ": "rocznik", "podzial": null, "grupa_nadrzedna": null, "liczba_studentow": 10},
               {"id": "R1-G1", "rocznik": "R1", "nazwa": "Grupa 1", "typ": "grupa", "podzial": "ćwiczenia", "grupa_nadrzedna": "R1-ALL", "liczba_studentow": 5}],
     "przedmioty": [{"id": "PRZ-1", "rocznik": "R1", "nazwa": "Analiza"}],
     "zajecia": [{"id": "ZT", "rocznik": "R1", "przedmiot_id": "PRZ-1", "forma": "W", "liczba_studentow": 10, "laczone_z": null,
                    "dodatkowi_studenci": 0, "godziny_programowe": 28, "liczba_spotkan": 14, "sloty_na_spotkanie": 2,
                    "czestotliwosc": "co_tydzien", "tydzien_od": 1, "tydzien_do": 14, "typy_sal": ["sala_dydaktyczna"],
                    "dozwolone_sale": [], "wymagane_wyposazenie": [], "tryb": "stacjonarny", "powiazanie": null,
                    "typ_powiazania": null, "tygodnie_niedostepne": [6], "uwagi": null, "grupy": ["R1-ALL"], "prowadzacy": ["PT"]}]}
  $json$::jsonb) ->> 'zajecia'),
  '1',
  'loading reports the number of classes'
);
select is((select array_agg(id) from public.zajecia_plan), array['ZT'], 'the old classes are replaced');
select is((select count(*)::int from public.sale), 1, 'the old rooms are replaced');
select is((select count(*)::int from public.generation_jobs), 0, 'generated plans are dropped with the old data');
select is((select tygodnie_niedostepne from public.zajecia_plan), array[6]::smallint[], 'lists become arrays');
select is((select typ_dnia::text from public.kalendarz), 'zajecia', 'the Polish day type maps onto the enum');

-- A rejected payload changes nothing.
select throws_ok(
  $$select public.wgraj_dane_planu(
    '{"zajecia": [{"id": "ZX", "rocznik": "NIE-MA", "przedmiot_id": "PRZ-1", "forma": "W", "liczba_studentow": 10, "liczba_spotkan": 14, "sloty_na_spotkanie": 2, "czestotliwosc": "co_tydzien", "tydzien_od": 1, "tydzien_do": 14, "tryb": "stacjonarny", "grupy": [], "prowadzacy": []}]}'::jsonb
  )$$,
  '23503', null, 'a reference to a missing row is rejected'
);
select is((select array_agg(id) from public.zajecia_plan), array['ZT'], 'after a rejected load the data is intact');

select * from finish();
rollback;
