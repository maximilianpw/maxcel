import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  COMPONENT_KINDS,
  DEPLOY_STATUSES,
  PROVIDER_IDS,
  PR_STATUSES,
} from '../src/platform/constants'

const componentKind = oneOfLiterals(COMPONENT_KINDS)

const deployStatus = oneOfLiterals(DEPLOY_STATUSES)

const prStatus = oneOfLiterals(PR_STATUSES)

const databaseAllocation = v.object({
  clusterName: v.string(),
  databaseName: v.string(),
  username: v.string(),
})

const encryptedSecret = v.object({
  version: v.number(),
  algorithm: v.string(),
  iv: v.string(),
  ciphertext: v.string(),
  authTag: v.string(),
})

const provider = oneOfLiterals(PROVIDER_IDS)

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    slug: v.string(),
    domain: v.string(),
    database: v.union(databaseAllocation, v.null()),
    prStatus,
    deployStatus,
    archivedAt: v.union(v.number(), v.null()),
  })
    .index('by_slug', ['slug'])
    .index('by_domain', ['domain'])
    .index('by_prStatus', ['prStatus'])
    .index('by_deployStatus', ['deployStatus']),

  appComponents: defineTable({
    projectId: v.id('projects'),
    kind: componentKind,
    githubOwner: v.string(),
    githubRepo: v.string(),
    branch: v.string(),
    appPath: v.string(),
    buildCommand: v.string(),
    outputDirectory: v.optional(v.string()),
    runCommand: v.optional(v.string()),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_kind', ['projectId', 'kind']),

  environmentVariables: defineTable({
    projectId: v.id('projects'),
    componentId: v.union(v.id('appComponents'), v.null()),
    key: v.string(),
    secret: v.boolean(),
    variableName: v.string(),
    encryptedValue: v.optional(encryptedSecret),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_componentId', ['projectId', 'componentId'])
    .index('by_projectId_and_key', ['projectId', 'key']),

  infraRevisions: defineTable({
    projectId: v.id('projects'),
    revisionId: v.string(),
    prTitle: v.string(),
    prBody: v.string(),
    estimatedMonthlyCostUsd: v.number(),
    terraformCloudWorkspace: v.string(),
    requiredSecrets: v.array(v.string()),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_revisionId', ['projectId', 'revisionId']),

  infraRevisionFiles: defineTable({
    revisionId: v.id('infraRevisions'),
    path: v.string(),
    contents: v.string(),
  }).index('by_revisionId', ['revisionId']),

  providerCredentials: defineTable({
    provider,
    displayName: v.string(),
    encryptedToken: encryptedSecret,
    metadataJson: v.optional(v.string()),
  }).index('by_provider', ['provider']),

  deployStatuses: defineTable({
    projectId: v.id('projects'),
    provider,
    status: deployStatus,
    statusUrl: v.optional(v.string()),
    message: v.optional(v.string()),
    observedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_provider', ['projectId', 'provider'])
    .index('by_projectId_and_observedAt', ['projectId', 'observedAt']),
})

function oneOfLiterals<const Values extends readonly string[]>(values: Values) {
  return v.union(...values.map((value) => v.literal(value)))
}
