-- Spec 08: through the API (anon / authenticated), everything is readable and nothing is writable.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

set local role anon;

select is((select count(*)::int from public.kierunki), 3, 'anon reads kierunki');
select is((select count(*)::int from public.zajecia), 17, 'anon reads zajecia');
select is((select rok_akademicki from public.ustawienia), '2026/2027', 'anon reads ustawienia');

select throws_ok(
  $$ insert into public.kierunki (id, nazwa) values ('test', 'Test') $$,
  '42501', null, 'anon cannot insert'
);
select throws_ok(
  $$ update public.prowadzacy set imie = 'X' $$,
  '42501', null, 'anon cannot update'
);
select throws_ok(
  $$ delete from public.zajecia $$,
  '42501', null, 'anon cannot delete'
);

reset role;
set local role authenticated;

select is((select count(*)::int from public.grupy), 8, 'authenticated reads grupy');
select throws_ok(
  $$ insert into public.dni_wolne (data, opis) values ('2026-11-11', 'Święto Niepodległości') $$,
  '42501', null, 'authenticated cannot write yet (spec 11 adds write policies)'
);

reset role;
select * from finish();
rollback;
