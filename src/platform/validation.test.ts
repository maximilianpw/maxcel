import { describe, expect, it } from 'vitest'
import {
  ConfigValidationError,
  normalizeRepoRef,
  validateProjectDraft,
} from './validation'

describe('project config validation', () => {
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
    expect(config.domain).toBe('my-cool-app.maximilian.pw')
    expect(config.components[0]?.repo).toEqual({
      owner: 'maxpw',
      name: 'web',
      branch: 'trunk',
      path: 'apps/web',
      fullName: 'maxpw/web',
    })
    expect(config.database).toEqual({
      clusterName: 'maxcel-shared-v1',
      databaseName: 'maxcel_my_cool_app_db',
      username: 'maxcel_my_cool_app_app',
    })
    expect(config.env[0]).toMatchObject({ key: 'SESSION_SECRET', secret: true })
  })

  it('accepts GitHub shorthand repo refs', () => {
    expect(
      normalizeRepoRef({ repo: 'MaxPW/Backend', path: '.', branch: '' }),
    ).toEqual({
      owner: 'maxpw',
      name: 'backend',
      branch: 'main',
      path: '.',
      fullName: 'maxpw/backend',
    })
  })

  it('requires at least one component and a matching maximilian.pw domain', () => {
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
