import type { InfraRevision, ProjectConfig, ProjectRecord } from '../types'

export interface PlatformStore {
  listProjects: () => Promise<ProjectRecord[]>
  createProject: (config: ProjectConfig) => Promise<ProjectRecord>
  archiveProject: (id: string) => Promise<ProjectRecord>
  generateInfraRevision: (id: string) => Promise<InfraRevision>
}
