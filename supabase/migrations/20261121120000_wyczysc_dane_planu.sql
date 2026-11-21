-- Clearing the whole database from the import page (spec 17).
--
-- `wyczysc_dane_planu()` empties the generator's input data, the generated plans and their manual edits in one
-- transaction: the same tables `wgraj_dane_planu` replaces, so the app is left as on a fresh project. `ustawienia`
-- (the academic year in the sidebar) stays. It returns how many rows of the main tables it removed, for the message.
--
-- Only service_role may call it (the import page's Server Action, after the user typed the confirmation phrase).
-- It is security definer so it can truncate. Expand-only: nothing else changes.

create function public.wyczysc_dane_planu() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usunieto jsonb;
begin
  v_usunieto := jsonb_build_object(
    'zajecia', (select count(*) from public.zajecia_plan),
    'grupy', (select count(*) from public.grupy_plan),
    'sale', (select count(*) from public.sale),
    'prowadzacy', (select count(*) from public.prowadzacy_plan),
    'plany', (select count(*) from public.generation_jobs)
  );

  -- Truncating the roots with cascade also empties everything that refers to them (groups, classes, plans…).
  truncate table
    public.roczniki, public.sale, public.prowadzacy_plan, public.sloty, public.kalendarz,
    public.rada_wydzialu, public.generation_jobs
  restart identity cascade;

  return v_usunieto;
end
$$;

revoke all on function public.wyczysc_dane_planu() from public, anon, authenticated;
grant execute on function public.wyczysc_dane_planu() to service_role;
