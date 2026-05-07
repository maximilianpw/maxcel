import { DEPLOY_STATUS, PR_STATUS } from '../constants'
import { generateInfraRevision } from '../terraform'
import type { InfraRevision, ProjectConfig, ProjectRecord } from '../types'
import type { PlatformStore } from './types'

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
      prStatus: PR_STATUS.DRAFT,
      deployStatus: DEPLOY_STATUS.IDLE,
    }
    this.projects.set(record.id, record)
    return record
  }

  async archiveProject(id: string): Promise<ProjectRecord> {
    const record = this.requireProject(id)
    record.archivedAt = new Date().toISOString()
    record.deployStatus = DEPLOY_STATUS.IDLE
    return record
  }

  async generateInfraRevision(id: string): Promise<InfraRevision> {
    const record = this.requireProject(id)
    const revision = generateInfraRevision(record.config)
    record.latestRevision = revision
    record.prStatus = PR_STATUS.OPEN
    record.deployStatus = DEPLOY_STATUS.WAITING_REVIEW
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
