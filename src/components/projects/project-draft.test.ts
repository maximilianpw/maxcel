import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANCH } from '@/platform/constants'
import { projectDomain } from '@/platform/validation'
import {
  defaultProjectDraftForm,
  formToProjectDraft,
  parseProjectEnv,
} from './project-draft'
import type { ProjectDraftFormState } from './project-draft'

describe('project draft form helpers', () => {
  it('converts the default nested form into a project draft', () => {
    const draft = formToProjectDraft(defaultProjectDraftForm)

    expect(draft).toEqual({
      name: 'Launchpad API',
      slug: 'launchpad-api',
      frontend: {
        repo: {
          repo: 'maxpw/launchpad',
          branch: DEFAULT_BRANCH,
          path: 'apps/web',
        },
        buildCommand: 'npm ci && npm run build',
        outputDirectory: 'dist',
      },
      backend: {
        repo: {
          repo: 'maxpw/launchpad-api',
          branch: DEFAULT_BRANCH,
          path: '.',
        },
        buildCommand: 'npm ci && npm run build',
        runCommand: 'node dist/server/index.mjs',
      },
      databaseNeeded: true,
      env: [
        {
          key: 'PUBLIC_API_URL',
          value: `https://${projectDomain('launchpad-api')}`,
          secret: true,
        },
        {
          key: 'SESSION_SECRET',
          value: 'replace-me',
          secret: true,
        },
      ],
    })
  })

  it('builds the default public API URL from the platform domain helper', () => {
    expect(defaultProjectDraftForm.project.env).toContain(
      `PUBLIC_API_URL=https://${projectDomain(defaultProjectDraftForm.project.slug)}`,
    )
  })

  it('omits the backend when the form disables it', () => {
    const form: ProjectDraftFormState = {
      ...defaultProjectDraftForm,
      settings: {
        ...defaultProjectDraftForm.settings,
        includeBackend: false,
        databaseNeeded: false,
      },
    }

    const draft = formToProjectDraft(form)

    expect(draft.backend).toBeNull()
    expect(draft.databaseNeeded).toBe(false)
  })

  it('parses env vars with blank lines, missing values, and extra equals signs', () => {
    expect(
      parseProjectEnv(`
        PUBLIC_API_URL=https://example.com?a=b

        FEATURE_FLAG
        SESSION_SECRET=replace=me
      `),
    ).toEqual([
      {
        key: 'PUBLIC_API_URL',
        value: 'https://example.com?a=b',
        secret: true,
      },
      {
        key: 'FEATURE_FLAG',
        value: '',
        secret: true,
      },
      {
        key: 'SESSION_SECRET',
        value: 'replace=me',
        secret: true,
      },
    ])
  })
})
