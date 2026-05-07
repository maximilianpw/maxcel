import type { ProjectConfig } from '../types'

export interface DigitalOceanAppSpec {
  name: string
  region: string
  domains: Array<{ domain: string; type: 'PRIMARY' }>
  services: Array<Record<string, unknown>>
  static_sites: Array<Record<string, unknown>>
  databases: Array<{ name: string; engine: 'PG'; production: boolean }>
}

export function toDigitalOceanAppSpec(
  config: ProjectConfig,
): DigitalOceanAppSpec {
  return {
    name: `maxcel-${config.slug}`,
    region: 'nyc',
    domains: [{ domain: config.domain, type: 'PRIMARY' }],
    services: config.components
      .filter((component) => component.kind === 'backend')
      .map((component) => ({
        name: `${config.slug}-backend`,
        github: githubSource(component.repo.fullName, component.repo.branch),
        source_dir: component.repo.path,
        build_command: component.buildCommand,
        run_command: component.runCommand,
        instance_count: 1,
        instance_size_slug: 'basic-xxs',
      })),
    static_sites: config.components
      .filter((component) => component.kind === 'frontend')
      .map((component) => ({
        name: `${config.slug}-frontend`,
        github: githubSource(component.repo.fullName, component.repo.branch),
        source_dir: component.repo.path,
        build_command: component.buildCommand,
        output_dir: component.outputDirectory ?? 'dist',
      })),
    databases: config.database
      ? [{ name: config.database.clusterName, engine: 'PG', production: true }]
      : [],
  }
}

export function toCloudflareDnsRecord(
  config: ProjectConfig,
  appHostname: string,
) {
  return {
    zone: 'maximilian.pw',
    name: config.slug,
    type: 'CNAME' as const,
    content: appHostname,
    proxied: true,
  }
}

export function toTerraformCloudWorkspace(config: ProjectConfig) {
  return {
    organizationVariable: 'TF_CLOUD_ORGANIZATION',
    workspace: `maxcel-${config.slug}`,
    stateTarget: `app/${config.slug}`,
  }
}

function githubSource(repo: string, branch: string) {
  return {
    repo,
    branch,
    deploy_on_push: true,
  }
}
