-- Spec 15: the worker reports how far a running generation job is.
-- Expand-only: an older worker simply never writes the column, an older app never reads it.

alter table public.generation_jobs
  add column postep jsonb,
  add constraint generation_jobs_postep_check check (postep is null or jsonb_typeof(postep) = 'object');

comment on column public.generation_jobs.postep is
  'Progress written by the worker while the job runs: {etap, uplynelo_s, limit_s, rozwiazania, kara, kara_startowa, dolna_granica, zaktualizowano}. Null until the worker reports for the first time.';
