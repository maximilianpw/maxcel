import type { EnvVarInput, ProjectDraftInput } from '@/platform/types'

export type ProjectComponentKey = 'frontend' | 'backend'

export interface ProjectComponentForm {
  repo: string
  branch: string
  path: string
  buildCommand: string
  outputDirectory: string
  runCommand: string
}

export interface ProjectDraftFormState {
  project: {
    name: string
    slug: string
    env: string
  }
  settings: {
    includeBackend: boolean
    databaseNeeded: boolean
  }
  components: Record<ProjectComponentKey, ProjectComponentForm>
}

export type ProjectField = keyof ProjectDraftFormState['project']
export type ProjectSetting = keyof ProjectDraftFormState['settings']
export type ProjectComponentField = keyof ProjectComponentForm

export const defaultProjectDraftForm: ProjectDraftFormState = {
  project: {
    name: 'Launchpad API',
    slug: 'launchpad-api',
    env: 'PUBLIC_API_URL=https://launchpad-api.maximilian.pw\nSESSION_SECRET=replace-me',
  },
  settings: {
    includeBackend: true,
    databaseNeeded: true,
  },
  components: {
    frontend: {
      repo: 'maxpw/launchpad',
      branch: 'main',
      path: 'apps/web',
      buildCommand: 'npm ci && npm run build',
      outputDirectory: 'dist',
      runCommand: '',
    },
    backend: {
      repo: 'maxpw/launchpad-api',
      branch: 'main',
      path: '.',
      buildCommand: 'npm ci && npm run build',
      outputDirectory: '',
      runCommand: 'node dist/server/index.mjs',
    },
  },
}

export function formToProjectDraft(
  form: ProjectDraftFormState,
): ProjectDraftInput {
  const frontend = form.components.frontend
  const backend = form.components.backend

  return {
    name: form.project.name,
    slug: form.project.slug,
    frontend: {
      repo: {
        repo: frontend.repo,
        branch: frontend.branch,
        path: frontend.path,
      },
      buildCommand: frontend.buildCommand,
      outputDirectory: frontend.outputDirectory,
    },
    backend: form.settings.includeBackend
      ? {
          repo: {
            repo: backend.repo,
            branch: backend.branch,
            path: backend.path,
          },
          buildCommand: backend.buildCommand,
          runCommand: backend.runCommand,
        }
      : null,
    databaseNeeded: form.settings.databaseNeeded,
    env: parseProjectEnv(form.project.env),
  }
}

export function parseProjectEnv(value: string): EnvVarInput[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=')
      return {
        key: index === -1 ? line : line.slice(0, index),
        value: index === -1 ? '' : line.slice(index + 1),
        secret: true,
      }
    })
}
