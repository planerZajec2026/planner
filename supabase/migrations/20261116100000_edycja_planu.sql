-- Spec 14: manual edits of a generated timetable.
--
-- Expand-only: two nullable/defaulted columns and one function, so the previous app version keeps working with this
-- schema. The new app reads the new columns, so this migration must be deployed before it. The worker inserts
-- `plan_zajec` rows with an explicit column list and is not affected.

-- How many manual edits were saved to this plan. It doubles as the plan's version: an edit is saved only if the
-- plan still has the version the editor saw (see zapisz_przydzialy).
alter table public.generation_jobs add column zmiany_reczne integer not null default 0;
alter table public.generation_jobs
  add constraint generation_jobs_zmiany_reczne_check check (zmiany_reczne >= 0);

-- null = the placement comes from the generator; otherwise the time of the last manual edit.
alter table public.plan_zajec add column edytowano timestamptz;

-- Saves new placements of classes in one plan, all or nothing.
--
-- `p_przydzialy` is an array of {"zajecia_id", "dzien", "slot", "sala_id", "tygodnie"}. Returns false and changes
-- nothing when the job is not a finished plan or was edited since version `p_wersja`. Two concurrent calls with the
-- same version cannot both succeed: the first locks the job row, the second re-checks the version after the lock.
--
-- The function does not check the timetable's hard constraints; the app's Server Action does that before calling.
-- Table constraints (day, slot, weeks, room foreign key) still apply. Only service_role may call it, and it runs
-- with the caller's rights: service_role already may update both tables.
create function public.zapisz_przydzialy(p_job_id uuid, p_wersja integer, p_przydzialy jsonb) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_zapisane integer;
begin
  if p_przydzialy is null or jsonb_typeof(p_przydzialy) <> 'array' or jsonb_array_length(p_przydzialy) = 0 then
    raise exception 'p_przydzialy musi być niepustą tablicą' using errcode = '22023';
  end if;

  update public.generation_jobs
  set zmiany_reczne = zmiany_reczne + 1
  where id = p_job_id and status = 'done' and zmiany_reczne = p_wersja;
  if not found then
    return false;
  end if;

  update public.plan_zajec p
  set dzien = r.dzien,
      slot = r.slot,
      sala_id = r.sala_id,
      tygodnie = array(select t::smallint from jsonb_array_elements_text(r.tygodnie) as t order by t::smallint),
      edytowano = now()
  from jsonb_to_recordset(p_przydzialy) as r (zajecia_id text, dzien smallint, slot smallint, sala_id text, tygodnie jsonb)
  where p.job_id = p_job_id and p.zajecia_id = r.zajecia_id;
  get diagnostics v_zapisane = row_count;

  -- A class that is not in the plan (or listed twice) aborts the whole call, including the version bump.
  if v_zapisane <> jsonb_array_length(p_przydzialy) then
    raise exception 'Zapisano % z % przydziałów: zajęć nie ma w planie albo powtarzają się',
      v_zapisane, jsonb_array_length(p_przydzialy) using errcode = '22023';
  end if;

  return true;
end
$$;

revoke all on function public.zapisz_przydzialy(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.zapisz_przydzialy(uuid, integer, jsonb) to service_role;
