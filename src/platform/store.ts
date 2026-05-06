import { generateInfraRevision } from './terraform'
import type { InfraRevision, ProjectConfig, ProjectRecord } from './types'

export interface PlatformStore {
  listProjects: () => Promise<ProjectRecord[]>
  createProject: (config: ProjectConfig) => Promise<ProjectRecord>
  archiveProject: (id: string) => Promise<ProjectRecord>
  generateInfraRevision: (id: string) => Promise<InfraRevision>
}

export class InMemoryPlatformStore implements PlatformStore {
  readonly projects = new Map<string, ProjectRecord>()

  async listProjects(): Promise<ProjectRecord[]> {
    return [...this.projects.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }

  async createProject(config: ProjectConfig): Promise<ProjectRecord> {
    const now = new Date().toISOString()
    const record: ProjectRecord = {
      id: crypto.randomUUID(),
      config,
      createdAt: now,
      archivedAt: null,
      prStatus: 'draft',
      deployStatus: 'idle',
    }
    this.projects.set(record.id, record)
    return record
  }

  async archiveProject(id: string): Promise<ProjectRecord> {
    const record = this.requireProject(id)
    record.archivedAt = new Date().toISOString()
    record.deployStatus = 'idle'
    return record
  }

  async generateInfraRevision(id: string): Promise<InfraRevision> {
    const record = this.requireProject(id)
    const revision = generateInfraRevision(record.config)
    record.latestRevision = revision
    record.prStatus = 'open'
    record.deployStatus = 'waiting_review'
    return revision
  }

  private requireProject(id: string): ProjectRecord {
    const record = this.projects.get(id)
    if (!record) {
      throw new Error(`Project ${id} not found`)
    }
    return record
  }
}

export const platformStore = new InMemoryPlatformStore()
