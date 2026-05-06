import { createServerFn } from '@tanstack/react-start'
import { platformStore } from './store'
import { validateProjectDraft } from './validation'
import type { ProjectDraftInput } from './types'

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    return platformStore.listProjects()
  },
)

export const createProjectDraft = createServerFn({ method: 'POST' })
  .inputValidator((data: ProjectDraftInput) => data)
  .handler(async ({ data }) => {
    const config = validateProjectDraft(data)
    return platformStore.createProject(config)
  })

export const generateInfraPr = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    return platformStore.generateInfraRevision(data.projectId)
  })

export const archiveProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    return platformStore.archiveProject(data.projectId)
  })

export const previewProjectConfig = createServerFn({ method: 'POST' })
  .inputValidator((data: ProjectDraftInput) => data)
  .handler(async ({ data }) => {
    return validateProjectDraft(data)
  })
