import {
  COMPONENT_KINDS,
  DEPLOY_STATUSES,
  PROVIDER_IDS,
  PR_STATUSES,
} from '../../constants'

export const POSTGRES_SCHEMA_SQL = `
create table projects (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  domain text not null unique,
  database_needed boolean not null,
  database_name text,
  database_username text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_components (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in (${sqlCheckList(COMPONENT_KINDS)})),
  github_owner text not null,
  github_repo text not null,
  branch text not null,
  app_path text not null,
  build_command text not null,
  output_directory text,
  run_command text,
  created_at timestamptz not null default now()
);

create table environment_variables (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  component_id uuid references app_components(id) on delete cascade,
  key text not null,
  secret boolean not null default true,
  encrypted_value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, component_id, key)
);

create table provider_credentials (
  id uuid primary key,
  provider text not null check (provider in (${sqlCheckList(PROVIDER_IDS)})),
  display_name text not null,
  encrypted_token jsonb not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table infra_revisions (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  files jsonb not null,
  pr_number integer,
  pr_url text,
  pr_status text not null check (pr_status in (${sqlCheckList(PR_STATUSES)})),
  terraform_cloud_workspace text not null,
  estimated_monthly_cost_usd numeric(8,2) not null,
  created_at timestamptz not null default now()
);

create table deploy_statuses (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  provider text not null check (provider in (${sqlCheckList(PROVIDER_IDS)})),
  status text not null check (status in (${sqlCheckList(DEPLOY_STATUSES)})),
  status_url text,
  message text,
  observed_at timestamptz not null default now()
);

create index app_components_project_id_idx on app_components(project_id);
create index environment_variables_project_id_idx on environment_variables(project_id);
create index infra_revisions_project_id_idx on infra_revisions(project_id);
create index deploy_statuses_project_id_observed_at_idx on deploy_statuses(project_id, observed_at desc);
`

function sqlCheckList(values: readonly string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ')
}
