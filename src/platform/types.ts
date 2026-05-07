import type {
  COMPONENT_KIND,
  DEPLOY_STATUS,
  PROVIDER_ID,
  PR_STATUS,
} from './constants'

export { DOMAIN_ROOT } from './constants'

export type ComponentKind = (typeof COMPONENT_KIND)[keyof typeof COMPONENT_KIND]
export type DeployStatus = (typeof DEPLOY_STATUS)[keyof typeof DEPLOY_STATUS]
export type PrStatus = (typeof PR_STATUS)[keyof typeof PR_STATUS]
export type ProviderId = (typeof PROVIDER_ID)[keyof typeof PROVIDER_ID]

export interface RepoRefInput {
  repo: string
  branch?: string
  path?: string
}

export interface RepoRef {
  owner: string
  name: string
  branch: string
  path: string
  fullName: string
}

export interface EnvVarInput {
  key: string
  value: string
  secret?: boolean
}

export interface EnvVarReference {
  key: string
  secret: boolean
  variableName: string
}

export interface ComponentInput {
  kind: ComponentKind
  repo: RepoRefInput
  buildCommand: string
  outputDirectory?: string
  runCommand?: string
  env?: EnvVarInput[]
}

export interface ComponentConfig {
  kind: ComponentKind
  repo: RepoRef
  buildCommand: string
  outputDirectory?: string
  runCommand?: string
  env: EnvVarReference[]
}

export interface ProjectDraftInput {
  name: string
  slug?: string
  desiredDomain?: string
  frontend?: Omit<ComponentInput, 'kind'> | null
  backend?: Omit<ComponentInput, 'kind'> | null
  databaseNeeded: boolean
  env?: EnvVarInput[]
}

export interface DatabaseAllocation {
  clusterName: string
  databaseName: string
  username: string
}

export interface ProjectConfig {
  name: string
  slug: string
  domain: string
  components: ComponentConfig[]
  database: DatabaseAllocation | null
  env: EnvVarReference[]
}

export interface GeneratedFile {
  path: string
  contents: string
}

export interface InfraRevision {
  id: string
  projectSlug: string
  files: GeneratedFile[]
  prTitle: string
  prBody: string
  estimatedMonthlyCostUsd: number
  terraformCloudWorkspace: string
  requiredSecrets: string[]
}

export interface ProjectRecord {
  id: string
  config: ProjectConfig
  createdAt: string
  archivedAt: string | null
  prStatus: PrStatus
  deployStatus: DeployStatus
  latestRevision?: InfraRevision
}
