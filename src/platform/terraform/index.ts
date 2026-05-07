import { buildInfraPrBody, buildInfraPrTitle } from '../github'
import {
  COMPONENT_KIND,
  DEFAULT_BRANCH,
  DIGITALOCEAN_REGION,
  DIGITALOCEAN_SERVICE_INSTANCE_SIZE,
  DOMAIN_ROOT,
  REQUIRED_PROVIDER_SECRET_NAMES,
  TERRAFORM_VARIABLES,
  platformResourceName,
} from '../constants'
import { toTerraformCloudWorkspace } from './providers'
import type { ComponentConfig, InfraRevision, ProjectConfig } from '../types'

export function generateInfraRevision(config: ProjectConfig): InfraRevision {
  const terraformCloud = toTerraformCloudWorkspace(config)
  const estimatedMonthlyCostUsd = estimateMonthlyCost(config)
  const terraformDirectory = projectTerraformDirectory(config)
  const requiredSecrets = [
    ...REQUIRED_PROVIDER_SECRET_NAMES,
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
        path: `${terraformDirectory}/main.tf`,
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
    `    organization = var.${TERRAFORM_VARIABLES.CLOUD_ORGANIZATION}`,
    `    workspaces {`,
    `      name = "${hclString(platformResourceName(config.slug))}"`,
    `    }`,
    `  }`,
    ``,
    `  required_providers {`,
    `    digitalocean = { source = "digitalocean/digitalocean", version = "~> 2.0" }`,
    `    cloudflare = { source = "cloudflare/cloudflare", version = "~> 5.0" }`,
    `  }`,
    `}`,
    ``,
    `variable "${TERRAFORM_VARIABLES.CLOUD_ORGANIZATION}" { type = string }`,
    `variable "${TERRAFORM_VARIABLES.DIGITALOCEAN_TOKEN}" { type = string, sensitive = true }`,
    `variable "${TERRAFORM_VARIABLES.CLOUDFLARE_API_TOKEN}" { type = string, sensitive = true }`,
    `variable "${TERRAFORM_VARIABLES.CLOUDFLARE_ZONE_ID}" { type = string }`,
    ...envVariables.map(
      (env) =>
        `variable "${env.variableName}" { type = string, sensitive = ${env.secret} }`,
    ),
    ``,
    `provider "digitalocean" { token = var.${TERRAFORM_VARIABLES.DIGITALOCEAN_TOKEN} }`,
    `provider "cloudflare" { api_token = var.${TERRAFORM_VARIABLES.CLOUDFLARE_API_TOKEN} }`,
    ``,
    ...(config.database ? renderDatabase(config, resourceName) : []),
    `resource "digitalocean_app" "${resourceName}" {`,
    `  spec {`,
    `    name   = "${hclString(platformResourceName(config.slug))}"`,
    `    region = "${DIGITALOCEAN_REGION}"`,
    ``,
    ...config.components.flatMap((component) =>
      renderComponent(component, config),
    ),
    `    domain {`,
    `      name = "${hclString(config.domain)}"`,
    `      type = "PRIMARY"`,
    `      zone = "${hclString(DOMAIN_ROOT)}"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `resource "cloudflare_dns_record" "${resourceName}" {`,
    `  zone_id = var.${TERRAFORM_VARIABLES.CLOUDFLARE_ZONE_ID}`,
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
  const blockName =
    component.kind === COMPONENT_KIND.FRONTEND ? 'static_site' : 'service'
  const name = `${config.slug}-${component.kind}`
  const env = [...config.env, ...component.env]

  return [
    `    ${blockName} {`,
    `      name             = "${hclString(name)}"`,
    `      source_dir       = "${hclString(component.repo.path)}"`,
    `      build_command    = "${hclString(component.buildCommand)}"`,
    ...(component.kind === COMPONENT_KIND.FRONTEND
      ? [
          `      output_dir       = "${hclString(component.outputDirectory ?? 'dist')}"`,
        ]
      : [
          `      run_command      = "${hclString(component.runCommand ?? '')}"`,
          `      instance_count   = 1`,
          `      instance_size_slug = "${DIGITALOCEAN_SERVICE_INSTANCE_SIZE}"`,
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
  const terraformDirectory = projectTerraformDirectory(config)

  return [
    `name: ${config.slug} terraform`,
    ``,
    `on:`,
    `  pull_request:`,
    `    paths:`,
    `      - "${terraformDirectory}/**"`,
    `  push:`,
    `    branches: [${DEFAULT_BRANCH}]`,
    `    paths:`,
    `      - "${terraformDirectory}/**"`,
    ``,
    `jobs:`,
    `  terraform:`,
    `    runs-on: ubuntu-latest`,
    `    defaults:`,
    `      run:`,
    `        working-directory: ${terraformDirectory}`,
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

function projectTerraformDirectory(config: ProjectConfig): string {
  return `projects/${config.slug}/terraform`
}
