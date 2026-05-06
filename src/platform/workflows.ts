import { createGitHubInfraPr } from './github'
import type { GitHubInfraClient, PullRequestResult } from './github'
import type { PlatformStore, ProjectRecord } from './store'
import { validateProjectDraft } from './validation'
import type { InfraRevision, ProjectDraftInput } from './types'

export interface OnboardProjectRequest {
  draft: ProjectDraftInput
  infraRepo: string
  baseBranch?: string
}

export interface OnboardProjectResult {
  project: ProjectRecord
  revision: InfraRevision
  pullRequest: PullRequestResult
}

export async function createProjectAndGenerateInfraPr(
  store: PlatformStore,
  github: GitHubInfraClient,
  request: OnboardProjectRequest,
): Promise<OnboardProjectResult> {
  const config = validateProjectDraft(request.draft)
  const project = await store.createProject(config)
  const revision = await store.generateInfraRevision(project.id)
  const pullRequest = await createGitHubInfraPr(github, {
    infraRepo: request.infraRepo,
    baseBranch: request.baseBranch ?? 'main',
    headBranch: `maxcel/${config.slug}`,
    revision,
  })

  return { project, revision, pullRequest }
}
