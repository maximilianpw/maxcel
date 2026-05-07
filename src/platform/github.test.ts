import { describe, expect, it } from 'vitest'
import { createProjectAndGenerateInfraPr } from './workflows'
import { InMemoryPlatformStore } from './stores/memory'

describe('GitHub infra PR workflow', () => {
  it('creates a project, generated files, and mocked pull request request', async () => {
    const store = new InMemoryPlatformStore()
    const requests: unknown[] = []
    const github = {
      createPullRequest: async (request: unknown) => {
        requests.push(request)
        return {
          number: 42,
          url: 'https://github.com/maxpw/infra/pull/42',
          status: 'open' as const,
        }
      },
    }

    const result = await createProjectAndGenerateInfraPr(store, github, {
      infraRepo: 'maxpw/infra',
      draft: {
        name: 'Docs Site',
        frontend: {
          repo: { repo: 'maxpw/docs', branch: 'main', path: '.' },
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
        },
        databaseNeeded: false,
      },
    })

    expect(result.project.config.slug).toBe('docs-site')
    expect(result.pullRequest.number).toBe(42)
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      repo: 'maxpw/infra',
      base: 'main',
      head: 'maxcel/docs-site',
      title: 'Provision docs-site on DigitalOcean App Platform',
    })
  })
})
