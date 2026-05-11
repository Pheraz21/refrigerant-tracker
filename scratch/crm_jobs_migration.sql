-- Run this in the Supabase SQL Editor to create the crm_jobs table
create table if not exists crm_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_number    text unique not null,
  prefix        text,
  customer      text,
  site_title    text,
  site_address  text,
  site_postcode text,
  uprn          text,
  raw_data      jsonb,
  imported_at   timestamptz default now(),
  start_date    text,
  category      text,
  fault_code    text,
  job_title     text
);

-- Index for fast UPRN lookups
create index if not exists crm_jobs_uprn_idx on crm_jobs (uprn);

-- ── If the table already exists, run these ALTER statements ───────────────────
alter table crm_jobs add column if not exists start_date  text;
alter table crm_jobs add column if not exists category    text;
alter table crm_jobs add column if not exists fault_code  text;
alter table crm_jobs add column if not exists job_title   text;
alter table crm_jobs add column if not exists prefix      text;
