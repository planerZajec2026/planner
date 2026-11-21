-- Starts the plan generator's worker as soon as a job is queued, instead of waiting for its schedule.
--
-- The worker runs on GitHub Actions (`solver-worker.yml`). Its `*/5` schedule is best effort: GitHub delays or skips
-- scheduled runs, and in practice a queued job waited for hours. Now every queued job sends one `workflow_dispatch`
-- through pg_net, so the worker starts within a minute. The schedule stays as a fallback for a lost request.
--
-- The GitHub token (fine-grained, this repository, Actions: read and write) lives only in Supabase Vault under the
-- name `github_worker_token`; see docs/wdrozenie.md. Without it (the local stack, CI) the trigger does nothing.
-- Expand-only: the app and the worker are not affected.

create extension if not exists pg_net with schema extensions;

-- pg_net sends the request after the inserting transaction commits, from a background worker, so the insert never
-- waits for GitHub and a failed request does not undo the job. Responses are kept in net._http_response for a while.
-- Several queued jobs in a row send several dispatches; the workflow's concurrency group runs them one at a time and
-- each run takes everything that is still queued.
create function public.uruchom_workera() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'github_worker_token';
  if v_token is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/planerZajec2026/planner/actions/workflows/solver-worker.yml/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'Content-Type', 'application/json',
      'User-Agent', 'studia-planer'
    )
  );
  return new;
end
$$;

revoke all on function public.uruchom_workera() from public, anon, authenticated, service_role;

create trigger generation_jobs_uruchom_workera
after insert on public.generation_jobs
for each row
when (new.status = 'queued')
execute function public.uruchom_workera();
