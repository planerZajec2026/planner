-- Spec 08: tables, enums, RLS and API grants.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Tables
select has_table('public', t, format('table %s exists', t))
from unnest(array[
  'kierunki', 'grupy', 'prowadzacy', 'przedmioty', 'prowadzacy_przedmioty',
  'zajecia', 'dni_wolne', 'odwolane_zajecia', 'ustawienia'
]) as t;

-- Every table in public has RLS, including tables added later.
select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null,
  'no table in public is without row level security'
);

-- Enums
select enum_has_labels('public', 'tryb_studiow', array['stacjonarne', 'niestacjonarne']);
select enum_has_labels('public', 'typ_zajec', array['wyklad', 'cwiczenia', 'laboratorium', 'seminarium']);
select enum_has_labels('public', 'powtarzalnosc', array['co-tydzien', 'parzyste', 'nieparzyste']);
select enum_has_labels('public', 'tytul_naukowy', array['mgr', 'mgr inż.', 'dr', 'dr inż.', 'dr hab.', 'prof.']);

-- API grants: anon may read every table and write none.
select ok(has_table_privilege('anon', format('public.%I', t), 'select'), format('anon can select %s', t))
from unnest(array[
  'kierunki', 'grupy', 'prowadzacy', 'przedmioty', 'prowadzacy_przedmioty',
  'zajecia', 'dni_wolne', 'odwolane_zajecia', 'ustawienia'
]) as t;

select ok(
  not has_table_privilege('anon', format('public.%I', t), 'insert')
  and not has_table_privilege('anon', format('public.%I', t), 'update')
  and not has_table_privilege('anon', format('public.%I', t), 'delete'),
  format('anon cannot write %s', t)
)
from unnest(array[
  'kierunki', 'grupy', 'prowadzacy', 'przedmioty', 'prowadzacy_przedmioty',
  'zajecia', 'dni_wolne', 'odwolane_zajecia', 'ustawienia'
]) as t;

select * from finish();
rollback;
