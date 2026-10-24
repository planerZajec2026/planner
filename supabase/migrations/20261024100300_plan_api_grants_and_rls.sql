-- Spec 13, migration 4: what the Data API may do with the generator tables.
--
-- Same rules as spec 08: RLS everywhere, public read, writes only for service_role (the worker and the import).
-- Queueing a job from the app needs a signed-in planner (spec 11); until then jobs are created server-side.

do $$
declare
  t text;
begin
  foreach t in array array[
    'sloty', 'kalendarz', 'sale', 'roczniki', 'grupy_plan', 'studenci', 'studenci_grupy', 'kolizje_grup',
    'prowadzacy_plan', 'przedmioty_plan', 'zajecia_plan', 'zajecia_plan_grupy', 'zajecia_plan_prowadzacy',
    'blokady_stale', 'rada_wydzialu', 'dezyderaty_terminy', 'dezyderaty_ogolne', 'dezyderaty_sale',
    'generation_jobs', 'plan_zajec'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
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

-- Identity columns need sequence access for inserts by service_role.
grant usage, select on sequence
  public.blokady_stale_id_seq, public.rada_wydzialu_id_seq, public.dezyderaty_sale_id_seq
to service_role;

revoke all on table public.plan_spotkania from anon, authenticated, service_role;
grant select on table public.plan_spotkania to anon, authenticated, service_role;
