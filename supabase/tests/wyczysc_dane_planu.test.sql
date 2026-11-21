-- Spec 17: clearing the whole database. The test runs on the seeded data and rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_function('public', 'wyczysc_dane_planu', array[]::text[], 'the clearing function exists');
select is(
  has_function_privilege('anon', 'public.wyczysc_dane_planu()', 'execute')
    or has_function_privilege('authenticated', 'public.wyczysc_dane_planu()', 'execute'),
  false,
  'the API roles cannot clear the database'
);
select ok(has_function_privilege('service_role', 'public.wyczysc_dane_planu()', 'execute'), 'service_role can');

-- A plan with a manual edit, so plans are cleared too.
insert into public.generation_jobs (id, status) values ('00000000-0000-0000-0000-000000000017', 'done');

select is(
  public.wyczysc_dane_planu() ->> 'zajecia',
  '174',
  'it reports how many classes it removed'
);
select is((select count(*)::int from public.zajecia_plan), 0, 'no classes left');
select is((select count(*)::int from public.grupy_plan), 0, 'no groups left');
select is((select count(*)::int from public.dezyderaty_terminy), 0, 'no preferences left');
select is((select count(*)::int from public.generation_jobs), 0, 'no plans left');
select isnt((select count(*)::int from public.ustawienia), 0, 'the academic year settings stay');

select * from finish();
rollback;
