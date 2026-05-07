import { describe, expect, it } from 'vitest'
import {
  toCloudflareDnsRecord,
  toDigitalOceanAppSpec,
  toTerraformCloudWorkspace,
} from './providers'
import { generateInfraRevision, renderTerraform } from './index'
import {
  DEFAULT_BRANCH,
  DOMAIN_ROOT,
  REQUIRED_PROVIDER_SECRET_NAMES,
  SHARED_POSTGRES_CLUSTER_NAME,
  TERRAFORM_CLOUD_ORG_GH_SECRET,
  TERRAFORM_STATE_TARGET_PREFIX,
  platformResourceName,
} from '../constants'
import type { ProjectDraftInput } from '../types'
import { projectDomain, validateProjectDraft } from '../validation'

describe('Terraform/OpenTofu generation', () => {
  it.each([
    ['frontend-only', draft({ backend: false, databaseNeeded: false })],
    ['backend-only', draft({ frontend: false, databaseNeeded: false })],
    ['frontend-backend', draft({ databaseNeeded: false })],
    ['frontend-backend-database', draft({ databaseNeeded: true })],
  ])('snapshot for %s projects', (_name, input) => {
    expect(renderTerraform(validateProjectDraft(input))).toMatchSnapshot()
  })

  it('creates a reviewable infra revision with workflow and PR body metadata', () => {
    const config = validateProjectDraft(draft({ databaseNeeded: true }))
    const revision = generateInfraRevision(config)

    expect(revision.files.map((file) => file.path)).toEqual([
      'projects/demo-app/terraform/main.tf',
      '.github/workflows/demo-app-terraform.yml',
    ])
    expect(revision.files[1]?.contents).toContain(
      'working-directory: projects/demo-app/terraform',
    )
    expect(revision.files[1]?.contents).toContain(
      '- "projects/demo-app/terraform/**"',
    )
    expect(revision.prBody).toContain(
      `DigitalOcean App Platform app: ${platformResourceName('demo-app')}`,
    )
    expect(revision.prBody).toContain(
      `Workspace: ${platformResourceName('demo-app')}`,
    )
    expect(revision.requiredSecrets).toEqual(
      expect.arrayContaining([...REQUIRED_PROVIDER_SECRET_NAMES]),
    )
    expect(revision.estimatedMonthlyCostUsd).toBe(25)
  })

  it('generates mocked provider payloads for integration boundaries', () => {
    const config = validateProjectDraft(draft({ databaseNeeded: true }))

    expect(toDigitalOceanAppSpec(config)).toMatchObject({
      name: platformResourceName('demo-app'),
      domains: [{ domain: projectDomain('demo-app'), type: 'PRIMARY' }],
      databases: [
        { name: SHARED_POSTGRES_CLUSTER_NAME, engine: 'PG', production: true },
      ],
    })
    expect(toCloudflareDnsRecord(config, 'demo.ondigitalocean.app')).toEqual({
      zone: DOMAIN_ROOT,
      name: 'demo-app',
      type: 'CNAME',
      content: 'demo.ondigitalocean.app',
      proxied: true,
    })
    expect(toTerraformCloudWorkspace(config)).toEqual({
      organizationVariable: TERRAFORM_CLOUD_ORG_GH_SECRET,
      workspace: platformResourceName('demo-app'),
      stateTarget: `${TERRAFORM_STATE_TARGET_PREFIX}/demo-app`,
    })
  })
})

function draft(options: {
  frontend?: boolean
  backend?: boolean
  databaseNeeded: boolean
}): ProjectDraftInput {
  return {
    name: 'Demo App',
    slug: 'demo-app',
    frontend:
      options.frontend === false
        ? null
        : {
            repo: {
              repo: 'maxpw/demo-web',
              branch: DEFAULT_BRANCH,
              path: 'apps/web',
            },
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          },
    backend:
      options.backend === false
        ? null
        : {
            repo: {
              repo: 'maxpw/demo-api',
              branch: DEFAULT_BRANCH,
              path: 'apps/api',
            },
            buildCommand: 'npm run build',
            runCommand: 'node dist/index.mjs',
          },
    databaseNeeded: options.databaseNeeded,
    env: [{ key: 'SESSION_SECRET', value: 'secret', secret: true }],
  }
}
