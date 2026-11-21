-- Queued generation jobs start the GitHub Actions worker through pg_net.
-- The requests below stay in net.http_request_queue: pg_net sends only committed rows, and the test rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_trigger('public', 'generation_jobs', 'generation_jobs_uruchom_workera', 'queued jobs start the worker');
select is(
  has_function_privilege('anon', 'public.uruchom_workera()', 'execute')
    or has_function_privilege('authenticated', 'public.uruchom_workera()', 'execute'),
  false,
  'the API roles cannot call the function that reads the GitHub token'
);

create temporary table przed as select coalesce(max(id), 0) as id from net.http_request_queue;

insert into public.generation_jobs (id, status) values ('00000000-0000-0000-0000-000000000021', 'queued');
select is(
  (select count(*) from net.http_request_queue where id > (select id from przed)),
  0::bigint,
  'without a token in Vault nothing is sent'
);

select vault.create_secret('github_pat_test', 'github_worker_token');

insert into public.generation_jobs (id, status) values ('00000000-0000-0000-0000-000000000022', 'queued');
select is(
  (select count(*) from net.http_request_queue where id > (select id from przed)),
  1::bigint,
  'a queued job sends one request'
);
select is(
  (select url from net.http_request_queue where id > (select id from przed)),
  'https://api.github.com/repos/planerZajec2026/planner/actions/workflows/solver-worker.yml/dispatches',
  'the request dispatches the worker workflow'
);
select is(
  (select headers ->> 'Authorization' from net.http_request_queue where id > (select id from przed)),
  'Bearer github_pat_test',
  'the request carries the token from Vault'
);

-- A finished plan inserted directly (the e2e setup does this) is not a job for the worker.
insert into public.generation_jobs (id, status) values ('00000000-0000-0000-0000-000000000023', 'done');
select is(
  (select count(*) from net.http_request_queue where id > (select id from przed)),
  1::bigint,
  'jobs that are not queued send nothing'
);

select * from finish();
rollback;
