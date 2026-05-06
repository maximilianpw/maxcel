import { describe, expect, it } from 'vitest'
import {
  toCloudflareDnsRecord,
  toDigitalOceanAppSpec,
  toTerraformCloudWorkspace,
} from './providers'
import { generateInfraRevision, renderTerraform } from './terraform'
import type { ProjectDraftInput } from './types'
import { validateProjectDraft } from './validation'

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
      'projects/demo-app/main.tf',
      '.github/workflows/demo-app-terraform.yml',
    ])
    expect(revision.prBody).toContain(
      'DigitalOcean App Platform app: maxcel-demo-app',
    )
    expect(revision.prBody).toContain('Workspace: maxcel-demo-app')
    expect(revision.requiredSecrets).toContain('DIGITALOCEAN_TOKEN')
    expect(revision.estimatedMonthlyCostUsd).toBe(25)
  })

  it('generates mocked provider payloads for integration boundaries', () => {
    const config = validateProjectDraft(draft({ databaseNeeded: true }))

    expect(toDigitalOceanAppSpec(config)).toMatchObject({
      name: 'maxcel-demo-app',
      domains: [{ domain: 'demo-app.maximilian.pw', type: 'PRIMARY' }],
      databases: [{ name: 'maxcel-shared-v1', engine: 'PG', production: true }],
    })
    expect(toCloudflareDnsRecord(config, 'demo.ondigitalocean.app')).toEqual({
      zone: 'maximilian.pw',
      name: 'demo-app',
      type: 'CNAME',
      content: 'demo.ondigitalocean.app',
      proxied: true,
    })
    expect(toTerraformCloudWorkspace(config)).toEqual({
      organizationVariable: 'TF_CLOUD_ORGANIZATION',
      workspace: 'maxcel-demo-app',
      stateTarget: 'app/demo-app',
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
            repo: { repo: 'maxpw/demo-web', branch: 'main', path: 'apps/web' },
            buildCommand: 'npm run build',
            outputDirectory: 'dist',
          },
    backend:
      options.backend === false
        ? null
        : {
            repo: { repo: 'maxpw/demo-api', branch: 'main', path: 'apps/api' },
            buildCommand: 'npm run build',
            runCommand: 'node dist/index.mjs',
          },
    databaseNeeded: options.databaseNeeded,
    env: [{ key: 'SESSION_SECRET', value: 'secret', secret: true }],
  }
}
