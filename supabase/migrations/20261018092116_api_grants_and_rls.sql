-- Spec 08, migration 5: what the Data API may do.
--
-- Every table has RLS. The timetable is public within the app, so anon and authenticated may read everything.
-- There are no insert/update/delete grants or policies for them: until login exists (spec 11), the API refuses all
-- writes. service_role (server-side only, never in the browser) gets full table access; it bypasses RLS anyway.

do $$
declare
  t text;
begin
  foreach t in array array[
    'kierunki', 'grupy', 'prowadzacy', 'przedmioty', 'prowadzacy_przedmioty',
    'zajecia', 'dni_wolne', 'odwolane_zajecia', 'ustawienia'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- Start from nothing, whatever the project's defaults granted, then grant exactly what is needed.
    execute format('revoke all on table public.%I from anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'Odczyt dla wszystkich', t
    );
  end loop;
end
$$;
