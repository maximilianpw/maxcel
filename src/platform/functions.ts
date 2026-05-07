import { createServerFn } from '@tanstack/react-start'
import * as projectOperations from './projects'
import type { ProjectDraftInput } from './types'

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    return projectOperations.listProjects()
  },
)

export const createProjectDraft = createServerFn({ method: 'POST' })
  .inputValidator((data: ProjectDraftInput) => data)
  .handler(async ({ data }) => {
    return projectOperations.createProjectDraft(data)
  })

export const generateInfraPr = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    return projectOperations.generateInfraPr(data.projectId)
  })

export const archiveProject = createServerFn({ method: 'POST' })
  .inputValidator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    return projectOperations.archiveProject(data.projectId)
  })

export const previewProjectConfig = createServerFn({ method: 'POST' })
  .inputValidator((data: ProjectDraftInput) => data)
  .handler(async ({ data }) => {
    return projectOperations.previewProjectConfig(data)
  })
