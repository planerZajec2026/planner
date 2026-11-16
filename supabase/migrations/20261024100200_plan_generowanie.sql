-- Spec 13, migration 3: generation jobs and the generated timetable.
--
-- The app queues a job (`queued`); the Python worker (service_role) claims it, solves, stores `plan_zajec` and the
-- validator's report, and sets `done` or `failed`.

create type public.status_zadania as enum ('queued', 'running', 'done', 'failed');

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  status public.status_zadania not null default 'queued',
  -- time limit in seconds and soft-constraint weights, e.g. {"limit_czasu": 120, "wagi": {"poza_godzinami": 2}}
  parametry jsonb not null default '{}',
  utworzono timestamptz not null default now(),
  rozpoczeto timestamptz,
  zakonczono timestamptz,
  blad text,
  -- hard-constraint violations by number and the soft-constraint breakdown, as reported by the validator
  raport jsonb,
  wynik_miekkich integer,
  constraint generation_jobs_parametry_check check (jsonb_typeof(parametry) = 'object'),
  constraint generation_jobs_blad_check check (status = 'failed' or blad is null)
);

-- The worker takes the oldest queued job; the UI lists the latest ones.
create index generation_jobs_status_utworzono_idx on public.generation_jobs (status, utworzono);

-- The timetable of one job: the placement of every class. `tygodnie` lists the plan-day occurrences (1-14).
create table public.plan_zajec (
  job_id uuid not null references public.generation_jobs (id) on delete cascade,
  zajecia_id text not null references public.zajecia_plan (id) on delete cascade,
  dzien smallint not null,
  slot smallint not null,
  sala_id text not null references public.sale (id) on delete restrict,
  tygodnie smallint[] not null,
  primary key (job_id, zajecia_id),
  constraint plan_zajec_dzien_check check (dzien between 1 and 5),
  constraint plan_zajec_slot_check check (slot between 1 and 12),
  constraint plan_zajec_tygodnie_check check (
    cardinality(tygodnie) > 0 and tygodnie <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]::smallint[]
  )
);

create index plan_zajec_zajecia_id_idx on public.plan_zajec (zajecia_id);
create index plan_zajec_sala_id_idx on public.plan_zajec (sala_id);

-- One row per meeting: the class placement expanded over its weeks and joined to the calendar date.
-- `security_invoker` makes the view obey the RLS of the caller instead of the view owner's.
create view public.plan_spotkania with (security_invoker = true) as
select
  p.job_id,
  p.zajecia_id,
  t.nr_tygodnia,
  k.data,
  p.dzien,
  p.slot as slot_od,
  p.slot + z.sloty_na_spotkanie - 1 as slot_do,
  p.sala_id
from public.plan_zajec p
join public.zajecia_plan z on z.id = p.zajecia_id
cross join lateral unnest(p.tygodnie) as t (nr_tygodnia)
join public.kalendarz k on k.plan_dnia = p.dzien and k.nr_tygodnia = t.nr_tygodnia;
