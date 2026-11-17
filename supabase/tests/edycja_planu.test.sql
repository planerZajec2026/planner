-- Spec 14: manual edits of a generated plan (columns and zapisz_przydzialy).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_column('public', 'generation_jobs', 'zmiany_reczne', 'jobs count manual edits');
select col_not_null('public', 'generation_jobs', 'zmiany_reczne', 'the edit counter is never null');
select has_column('public', 'plan_zajec', 'edytowano', 'placements record when they were edited');
select col_is_null('public', 'plan_zajec', 'edytowano', 'a generated placement has no edit time');

-- Only service_role may save edits.
select ok(
  not has_function_privilege('anon', 'public.zapisz_przydzialy(uuid, integer, jsonb)', 'execute'),
  'anon cannot save edits'
);
select ok(
  not has_function_privilege('authenticated', 'public.zapisz_przydzialy(uuid, integer, jsonb)', 'execute'),
  'authenticated cannot save edits'
);
select ok(
  has_function_privilege('service_role', 'public.zapisz_przydzialy(uuid, integer, jsonb)', 'execute'),
  'service_role can save edits'
);
select ok(
  (select not prosecdef from pg_proc where oid = 'public.zapisz_przydzialy(uuid, integer, jsonb)'::regprocedure),
  'the function runs with the caller''s rights'
);

-- A finished plan with two classes, and a queued job.
insert into public.generation_jobs (id, status, zakonczono)
values ('00000000-0000-0000-0000-0000000000a1', 'done', now()),
       ('00000000-0000-0000-0000-0000000000a2', 'queued', null);
insert into public.plan_zajec (job_id, zajecia_id, dzien, slot, sala_id, tygodnie)
select '00000000-0000-0000-0000-0000000000a1', z.id, 1, 1, (select min(id) from public.sale), array[1, 2]::smallint[]
from public.zajecia_plan z
where z.id in ('Z001', 'Z002');

select is(
  (select zmiany_reczne from public.generation_jobs where id = '00000000-0000-0000-0000-0000000000a1'),
  0,
  'a new plan has no manual edits'
);

-- A successful save.
select is(
  public.zapisz_przydzialy(
    '00000000-0000-0000-0000-0000000000a1', 0,
    format('[{"zajecia_id": "Z001", "dzien": 3, "slot": 5, "sala_id": %s, "tygodnie": [4, 2, 6]}]',
           to_jsonb((select max(id) from public.sale)))::jsonb
  ),
  true,
  'an edit of the current version is saved'
);
select is(
  (select array[dzien, slot] from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z001'),
  array[3, 5]::smallint[],
  'the day and slot change'
);
select is(
  (select sala_id from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z001'),
  (select max(id) from public.sale),
  'the room changes'
);
select is(
  (select tygodnie from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z001'),
  array[2, 4, 6]::smallint[],
  'the weeks are stored sorted'
);
select ok(
  (select edytowano is not null from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z001'),
  'the edited class is marked'
);
select ok(
  (select edytowano is null from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z002'),
  'other classes are not marked'
);
select is(
  (select zmiany_reczne from public.generation_jobs where id = '00000000-0000-0000-0000-0000000000a1'),
  1,
  'the save bumps the plan version'
);

-- A stale version changes nothing.
select is(
  public.zapisz_przydzialy(
    '00000000-0000-0000-0000-0000000000a1', 0,
    '[{"zajecia_id": "Z002", "dzien": 5, "slot": 9, "sala_id": "X", "tygodnie": [1]}]'::jsonb
  ),
  false,
  'an edit of a stale version is refused'
);
select is(
  (select dzien from public.plan_zajec
   where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z002'),
  1::smallint,
  'a refused edit changes nothing'
);

-- A job that is not a finished plan cannot be edited.
select is(
  public.zapisz_przydzialy(
    '00000000-0000-0000-0000-0000000000a2', 0,
    '[{"zajecia_id": "Z001", "dzien": 1, "slot": 1, "sala_id": "X", "tygodnie": [1]}]'::jsonb
  ),
  false,
  'a job that is not done is refused'
);

-- A class missing from the plan aborts the whole save, including the version bump.
select throws_ok(
  format(
    $$select public.zapisz_przydzialy(
      '00000000-0000-0000-0000-0000000000a1', 1,
      '[{"zajecia_id": "Z002", "dzien": 2, "slot": 2, "sala_id": %s, "tygodnie": [1, 2]},
        {"zajecia_id": "Z003", "dzien": 2, "slot": 2, "sala_id": %s, "tygodnie": [1, 2]}]'::jsonb
    )$$,
    to_jsonb((select min(id) from public.sale)), to_jsonb((select min(id) from public.sale))
  ),
  '22023', null, 'a class that is not in the plan is rejected'
);
select is(
  (select array[
     (select zmiany_reczne from public.generation_jobs where id = '00000000-0000-0000-0000-0000000000a1'),
     (select dzien::int from public.plan_zajec
      where job_id = '00000000-0000-0000-0000-0000000000a1' and zajecia_id = 'Z002')
   ]),
  array[1, 1],
  'a rejected save leaves the version and the placements intact'
);

select * from finish();
rollback;
