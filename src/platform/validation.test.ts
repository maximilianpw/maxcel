import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BRANCH,
  DOMAIN_ROOT,
  PLATFORM_RESOURCE_PREFIX,
  SHARED_POSTGRES_CLUSTER_NAME,
} from './constants'
import {
  ConfigValidationError,
  normalizeRepoRef,
  projectDomain,
  validateProjectDraft,
} from './validation'

describe('project config validation', () => {
  it('builds project domains from the shared domain root', () => {
    expect(projectDomain('demo-app')).toBe(`demo-app.${DOMAIN_ROOT}`)
  })

  it('normalizes slugs, domains, repo refs, paths, and database allocation', () => {
    const config = validateProjectDraft({
      name: 'My Cool App',
      frontend: {
        repo: {
          repo: 'https://github.com/MaxPW/Web.git',
          branch: 'trunk',
          path: '/apps/web/',
        },
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
      databaseNeeded: true,
      env: [{ key: 'session_secret', value: 'secret' }],
    })

    expect(config.slug).toBe('my-cool-app')
    expect(config.domain).toBe(projectDomain('my-cool-app'))
    expect(config.components[0]?.repo).toEqual({
      owner: 'maxpw',
      name: 'web',
      branch: 'trunk',
      path: 'apps/web',
      fullName: 'maxpw/web',
    })
    expect(config.database).toEqual({
      clusterName: SHARED_POSTGRES_CLUSTER_NAME,
      databaseName: `${PLATFORM_RESOURCE_PREFIX}_my_cool_app_db`,
      username: `${PLATFORM_RESOURCE_PREFIX}_my_cool_app_app`,
    })
    expect(config.env[0]).toMatchObject({ key: 'SESSION_SECRET', secret: true })
  })

  it('accepts GitHub shorthand repo refs', () => {
    expect(
      normalizeRepoRef({ repo: 'MaxPW/Backend', path: '.', branch: '' }),
    ).toEqual({
      owner: 'maxpw',
      name: 'backend',
      branch: DEFAULT_BRANCH,
      path: '.',
      fullName: 'maxpw/backend',
    })
  })

  it('requires at least one component and a matching platform domain', () => {
    expect(() =>
      validateProjectDraft({
        name: 'Bad',
        slug: 'bad',
        desiredDomain: 'custom.example.com',
        databaseNeeded: false,
      }),
    ).toThrow(ConfigValidationError)
  })
})
