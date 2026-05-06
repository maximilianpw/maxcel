import { buildInfraPrBody, buildInfraPrTitle } from './github'
import { toTerraformCloudWorkspace } from './providers'
import type { ComponentConfig, InfraRevision, ProjectConfig } from './types'

export function generateInfraRevision(config: ProjectConfig): InfraRevision {
  const terraformCloud = toTerraformCloudWorkspace(config)
  const estimatedMonthlyCostUsd = estimateMonthlyCost(config)
  const requiredSecrets = [
    'DIGITALOCEAN_TOKEN',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ZONE_ID',
    'TF_API_TOKEN',
    ...config.env.map((env) => `TF_VAR_${env.variableName}`),
    ...config.components.flatMap((component) =>
      component.env.map((env) => `TF_VAR_${env.variableName}`),
    ),
  ]
  const revisionBase = {
    id: `infra-${config.slug}`,
    projectSlug: config.slug,
    files: [
      {
        path: `projects/${config.slug}/main.tf`,
        contents: renderTerraform(config),
      },
      {
        path: `.github/workflows/${config.slug}-terraform.yml`,
        contents: renderGitHubActionsWorkflow(config),
      },
    ],
    prTitle: buildInfraPrTitle(config),
    estimatedMonthlyCostUsd,
    terraformCloudWorkspace: terraformCloud.workspace,
    requiredSecrets,
  }

  return {
    ...revisionBase,
    prBody: buildInfraPrBody(config, revisionBase),
  }
}

export function renderTerraform(config: ProjectConfig): string {
  const resourceName = hclName(config.slug)
  const envVariables = [
    ...config.env,
    ...config.components.flatMap((component) => component.env),
  ]

  return [
    `terraform {`,
    `  cloud {`,
    `    organization = var.terraform_cloud_organization`,
    `    workspaces {`,
    `      name = "maxcel-${hclString(config.slug)}"`,
    `    }`,
    `  }`,
    ``,
    `  required_providers {`,
    `    digitalocean = { source = "digitalocean/digitalocean", version = "~> 2.0" }`,
    `    cloudflare = { source = "cloudflare/cloudflare", version = "~> 5.0" }`,
    `  }`,
    `}`,
    ``,
    `variable "terraform_cloud_organization" { type = string }`,
    `variable "digitalocean_token" { type = string, sensitive = true }`,
    `variable "cloudflare_api_token" { type = string, sensitive = true }`,
    `variable "cloudflare_zone_id" { type = string }`,
    ...envVariables.map(
      (env) =>
        `variable "${env.variableName}" { type = string, sensitive = ${env.secret} }`,
    ),
    ``,
    `provider "digitalocean" { token = var.digitalocean_token }`,
    `provider "cloudflare" { api_token = var.cloudflare_api_token }`,
    ``,
    ...(config.database ? renderDatabase(config, resourceName) : []),
    `resource "digitalocean_app" "${resourceName}" {`,
    `  spec {`,
    `    name   = "maxcel-${hclString(config.slug)}"`,
    `    region = "nyc"`,
    ``,
    ...config.components.flatMap((component) =>
      renderComponent(component, config),
    ),
    `    domain {`,
    `      name = "${hclString(config.domain)}"`,
    `      type = "PRIMARY"`,
    `      zone = "${hclString('maximilian.pw')}"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `resource "cloudflare_dns_record" "${resourceName}" {`,
    `  zone_id = var.cloudflare_zone_id`,
    `  name    = "${hclString(config.slug)}"`,
    `  content = digitalocean_app.${resourceName}.default_ingress`,
    `  type    = "CNAME"`,
    `  proxied = true`,
    `  ttl     = 1`,
    `}`,
    ``,
    `output "app_url" { value = "https://${hclString(config.domain)}" }`,
  ].join('\n')
}

function renderDatabase(config: ProjectConfig, resourceName: string): string[] {
  if (!config.database) {
    return []
  }

  return [
    `data "digitalocean_database_cluster" "shared_postgres" {`,
    `  name = "${hclString(config.database.clusterName)}"`,
    `}`,
    ``,
    `resource "digitalocean_database_db" "${resourceName}" {`,
    `  cluster_id = data.digitalocean_database_cluster.shared_postgres.id`,
    `  name       = "${hclString(config.database.databaseName)}"`,
    `}`,
    ``,
    `resource "digitalocean_database_user" "${resourceName}" {`,
    `  cluster_id = data.digitalocean_database_cluster.shared_postgres.id`,
    `  name       = "${hclString(config.database.username)}"`,
    `}`,
    ``,
  ]
}

function renderComponent(
  component: ComponentConfig,
  config: ProjectConfig,
): string[] {
  const blockName = component.kind === 'frontend' ? 'static_site' : 'service'
  const name = `${config.slug}-${component.kind}`
  const env = [...config.env, ...component.env]

  return [
    `    ${blockName} {`,
    `      name             = "${hclString(name)}"`,
    `      source_dir       = "${hclString(component.repo.path)}"`,
    `      build_command    = "${hclString(component.buildCommand)}"`,
    ...(component.kind === 'frontend'
      ? [
          `      output_dir       = "${hclString(component.outputDirectory ?? 'dist')}"`,
        ]
      : [
          `      run_command      = "${hclString(component.runCommand ?? '')}"`,
          `      instance_count   = 1`,
          `      instance_size_slug = "basic-xxs"`,
        ]),
    ``,
    `      github {`,
    `        repo           = "${hclString(component.repo.fullName)}"`,
    `        branch         = "${hclString(component.repo.branch)}"`,
    `        deploy_on_push = true`,
    `      }`,
    ...(env.length > 0
      ? [
          ``,
          ...env.flatMap((item) => [
            `      env {`,
            `        key   = "${hclString(item.key)}"`,
            `        value = var.${item.variableName}`,
            `        type  = "${item.secret ? 'SECRET' : 'GENERAL'}"`,
            `      }`,
          ]),
        ]
      : []),
    ...(config.database
      ? [
          `      env {`,
          `        key   = "DATABASE_NAME"`,
          `        value = digitalocean_database_db.${hclName(config.slug)}.name`,
          `        type  = "GENERAL"`,
          `      }`,
          `      env {`,
          `        key   = "DATABASE_USER"`,
          `        value = digitalocean_database_user.${hclName(config.slug)}.name`,
          `        type  = "GENERAL"`,
          `      }`,
        ]
      : []),
    `    }`,
    ``,
  ]
}

function renderGitHubActionsWorkflow(config: ProjectConfig): string {
  return [
    `name: ${config.slug} terraform`,
    ``,
    `on:`,
    `  pull_request:`,
    `    paths:`,
    `      - "projects/${config.slug}/**"`,
    `  push:`,
    `    branches: [main]`,
    `    paths:`,
    `      - "projects/${config.slug}/**"`,
    ``,
    `jobs:`,
    `  terraform:`,
    `    runs-on: ubuntu-latest`,
    `    defaults:`,
    `      run:`,
    `        working-directory: projects/${config.slug}`,
    `    steps:`,
    `      - uses: actions/checkout@v4`,
    `      - uses: hashicorp/setup-terraform@v3`,
    `      - run: terraform fmt -check`,
    `      - run: terraform init`,
    `      - run: terraform plan`,
    `      - if: github.event_name == 'push'`,
    `        run: terraform apply -auto-approve`,
  ].join('\n')
}

function estimateMonthlyCost(config: ProjectConfig): number {
  const appCost = config.components.length * 5
  const dbCost = config.database ? 15 : 0
  return appCost + dbCost
}

function hclName(value: string): string {
  return value.replace(/-/g, '_')
}

function hclString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
