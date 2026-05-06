import { DOMAIN_ROOT } from './types'
import type {
  ComponentConfig,
  ComponentInput,
  EnvVarInput,
  EnvVarReference,
  ProjectConfig,
  ProjectDraftInput,
  RepoRef,
  RepoRefInput,
} from './types'

export class ConfigValidationError extends Error {
  constructor(readonly issues: Array<{ path: string; message: string }>) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '))
    this.name = 'ConfigValidationError'
  }
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function projectDomain(slug: string): string {
  return `${slug}.${DOMAIN_ROOT}`
}

export function normalizeRepoPath(path?: string): string {
  const normalized = (path ?? '').trim().replace(/^\/+|\/+$/g, '')
  return normalized === '' || normalized === '.' ? '.' : normalized
}

export function normalizeRepoRef(input: RepoRefInput): RepoRef {
  const repo = input.repo.trim()
  const match =
    repo.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?\/?$/i) ??
    repo.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i) ??
    repo.match(/^([^/\s]+)\/([^/\s.]+)$/)

  if (!match) {
    throw new ConfigValidationError([
      { path: 'repo', message: 'Use owner/repo or a GitHub repo URL' },
    ])
  }

  const owner = match[1].toLowerCase()
  const name = match[2].toLowerCase()

  return {
    owner,
    name,
    branch: input.branch?.trim() || 'main',
    path: normalizeRepoPath(input.path),
    fullName: `${owner}/${name}`,
  }
}

export function normalizeEnvVars(
  env: EnvVarInput[] | undefined,
  scope: string,
): EnvVarReference[] {
  return (env ?? []).map((item, index) => {
    const key = item.key.trim().toUpperCase()
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw new ConfigValidationError([
        {
          path: `${scope}.${index}.key`,
          message: 'Use shell-style uppercase env var names',
        },
      ])
    }

    return {
      key,
      secret: item.secret ?? true,
      variableName: `${slugify(scope)}_${key}`.replace(/-/g, '_'),
    }
  })
}

export function validateProjectDraft(input: ProjectDraftInput): ProjectConfig {
  const issues: Array<{ path: string; message: string }> = []
  const name = input.name.trim()
  const slug = slugify(input.slug || name)

  if (name.length < 2) {
    issues.push({ path: 'name', message: 'Project name is required' })
  }
  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) {
    issues.push({
      path: 'slug',
      message: 'Slug must be 3-48 lowercase letters, numbers, or dashes',
    })
  }

  const components: ComponentConfig[] = []
  for (const [kind, value] of [
    ['frontend', input.frontend],
    ['backend', input.backend],
  ] as const) {
    if (!value) {
      continue
    }

    try {
      components.push(normalizeComponent({ ...value, kind }, `${kind}`))
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        issues.push(...error.issues)
      } else {
        throw error
      }
    }
  }

  if (components.length === 0) {
    issues.push({
      path: 'components',
      message: 'At least one frontend or backend component is required',
    })
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(issues)
  }

  const domain = input.desiredDomain?.trim() || projectDomain(slug)
  if (domain !== projectDomain(slug)) {
    throw new ConfigValidationError([
      {
        path: 'desiredDomain',
        message: `V1 domains must be project slugs under ${DOMAIN_ROOT}`,
      },
    ])
  }

  return {
    name,
    slug,
    domain,
    components,
    database: input.databaseNeeded
      ? {
          clusterName: 'maxcel-shared-v1',
          databaseName: dbIdentifier(`${slug}_db`),
          username: dbIdentifier(`${slug}_app`),
        }
      : null,
    env: normalizeEnvVars(input.env, 'project'),
  }
}

function normalizeComponent(
  input: ComponentInput,
  scope: string,
): ComponentConfig {
  const buildCommand = input.buildCommand.trim()
  const runCommand = input.runCommand?.trim()
  const outputDirectory = input.outputDirectory?.trim()

  if (!buildCommand) {
    throw new ConfigValidationError([
      { path: `${scope}.buildCommand`, message: 'Build command is required' },
    ])
  }
  if (input.kind === 'backend' && !runCommand) {
    throw new ConfigValidationError([
      {
        path: `${scope}.runCommand`,
        message: 'Backend start command is required',
      },
    ])
  }

  return {
    kind: input.kind,
    repo: normalizeRepoRef(input.repo),
    buildCommand,
    outputDirectory: outputDirectory || undefined,
    runCommand: runCommand || undefined,
    env: normalizeEnvVars(input.env, scope),
  }
}

function dbIdentifier(value: string): string {
  return `maxcel_${slugify(value).replace(/-/g, '_')}`.slice(0, 63)
}
