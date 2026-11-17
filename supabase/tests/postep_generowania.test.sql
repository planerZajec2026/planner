-- Spec 15: progress of a running generation job.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_column('public', 'generation_jobs', 'postep', 'jobs carry the worker''s progress');
select col_type_is('public', 'generation_jobs', 'postep', 'jsonb', 'progress is a JSON document');
select col_is_null('public', 'generation_jobs', 'postep', 'a job has no progress until the worker reports');

insert into public.generation_jobs (id, status, rozpoczeto)
values ('00000000-0000-0000-0000-000000000015', 'running', now());

select lives_ok(
  $$update public.generation_jobs
    set postep = '{"etap": "optymalizacja", "uplynelo_s": 12.5, "limit_s": 200}'::jsonb
      || jsonb_build_object('zaktualizowano', now())
    where id = '00000000-0000-0000-0000-000000000015'$$,
  'the worker stores progress as an object'
);
select is(
  (select postep ->> 'etap' from public.generation_jobs where id = '00000000-0000-0000-0000-000000000015'),
  'optymalizacja',
  'the stage is read back'
);
select throws_ok(
  $$update public.generation_jobs set postep = '[1, 2]'::jsonb where id = '00000000-0000-0000-0000-000000000015'$$,
  '23514', null, 'progress must be an object'
);

-- The app reads progress with the visitor's rights and never writes it.
set local role anon;
select is(
  (select postep ->> 'limit_s' from public.generation_jobs where id = '00000000-0000-0000-0000-000000000015'),
  '200',
  'anon reads the progress'
);
reset role;

select * from finish();
rollback;
