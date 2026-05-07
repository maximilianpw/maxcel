import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BRANCH,
  PLATFORM_RESOURCE_PREFIX,
  PR_STATUS,
} from './constants'
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
          status: PR_STATUS.OPEN,
        }
      },
    }

    const result = await createProjectAndGenerateInfraPr(store, github, {
      infraRepo: 'maxpw/infra',
      draft: {
        name: 'Docs Site',
        frontend: {
          repo: { repo: 'maxpw/docs', branch: DEFAULT_BRANCH, path: '.' },
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
      base: DEFAULT_BRANCH,
      head: `${PLATFORM_RESOURCE_PREFIX}/docs-site`,
      title: 'Provision docs-site on DigitalOcean App Platform',
    })
  })
})
