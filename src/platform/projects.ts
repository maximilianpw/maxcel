import { platformStore } from './stores/memory'
import { validateProjectDraft } from './validation'
import type {
  InfraRevision,
  ProjectConfig,
  ProjectDraftInput,
  ProjectRecord,
} from './types'

export async function listProjects(): Promise<ProjectRecord[]> {
  return platformStore.listProjects()
}

export async function createProjectDraft(
  input: ProjectDraftInput,
): Promise<ProjectRecord> {
  const config = validateProjectDraft(input)
  return platformStore.createProject(config)
}

export async function generateInfraPr(
  projectId: string,
): Promise<InfraRevision> {
  return platformStore.generateInfraRevision(projectId)
}

export async function archiveProject(
  projectId: string,
): Promise<ProjectRecord> {
  return platformStore.archiveProject(projectId)
}

export async function previewProjectConfig(
  input: ProjectDraftInput,
): Promise<ProjectConfig> {
  return validateProjectDraft(input)
}
