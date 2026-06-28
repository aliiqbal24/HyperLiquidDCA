alter table execution_logs
  add column if not exists status text;

update execution_logs
set status = coalesce(log->>'status', 'submitted')
where status is null;

alter table execution_logs
  alter column status set not null;

create index if not exists execution_logs_account_status_created_idx
  on execution_logs (account_id, status, created_at);
