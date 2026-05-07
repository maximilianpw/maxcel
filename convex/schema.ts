import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const componentKind = v.union(v.literal('frontend'), v.literal('backend'))

const deployStatus = v.union(
  v.literal('idle'),
  v.literal('planning'),
  v.literal('waiting_review'),
  v.literal('deploying'),
  v.literal('ready'),
  v.literal('failed'),
)

const prStatus = v.union(
  v.literal('draft'),
  v.literal('open'),
  v.literal('merged'),
  v.literal('closed'),
)

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

const provider = v.union(
  v.literal('github'),
  v.literal('digitalocean'),
  v.literal('cloudflare'),
  v.literal('terraform_cloud'),
)

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
    provider: v.string(),
    status: deployStatus,
    statusUrl: v.optional(v.string()),
    message: v.optional(v.string()),
    observedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_and_provider', ['projectId', 'provider'])
    .index('by_projectId_and_observedAt', ['projectId', 'observedAt']),
})
