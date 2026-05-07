import {
  PR_STATUS,
  TERRAFORM_STATE_TARGET_PREFIX,
  platformResourceName,
} from './constants'
import type { InfraRevision, ProjectConfig } from './types'

export interface InfraPrRequest {
  infraRepo: string
  baseBranch: string
  headBranch: string
  revision: InfraRevision
}

export interface PullRequestResult {
  number: number
  url: string
  status: typeof PR_STATUS
}

export interface GitHubInfraClient {
  createPullRequest: (request: {
    repo: string
    base: string
    head: string
    title: string
    body: string
    files: Array<{ path: string; contents: string }>
  }) => Promise<PullRequestResult>
}

export interface GitHubAuthConfig {
  clientId: string
  clientSecret: string
  allowedLogin: string
}

export function loadGitHubAuthConfig(env = process.env): GitHubAuthConfig {
  const clientId = env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET
  const allowedLogin = env.ALLOWED_GITHUB_LOGIN

  if (!clientId || !clientSecret || !allowedLogin) {
    throw new Error(
      'GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, and ALLOWED_GITHUB_LOGIN are required',
    )
  }

  return { clientId, clientSecret, allowedLogin: allowedLogin.toLowerCase() }
}

export function isAllowedGitHubUser(
  login: string,
  config: Pick<GitHubAuthConfig, 'allowedLogin'>,
): boolean {
  return login.toLowerCase() === config.allowedLogin.toLowerCase()
}

export function buildInfraPrTitle(config: ProjectConfig): string {
  return `Provision ${config.slug} on DigitalOcean App Platform`
}

export function buildInfraPrBody(
  config: ProjectConfig,
  revision: Pick<
    InfraRevision,
    'requiredSecrets' | 'estimatedMonthlyCostUsd' | 'terraformCloudWorkspace'
  >,
): string {
  const resources = [
    `DigitalOcean App Platform app: ${platformResourceName(config.slug)}`,
    `Cloudflare DNS CNAME: ${config.domain}`,
    config.database
      ? `DigitalOcean Postgres allocation: database ${config.database.databaseName}, user ${config.database.username}`
      : null,
  ].filter(Boolean)

  return [
    `## Generated Resources`,
    ...resources.map((resource) => `- ${resource}`),
    ``,
    `## Estimated Monthly Baseline Cost`,
    `$${revision.estimatedMonthlyCostUsd.toFixed(2)} USD before traffic-dependent usage.`,
    ``,
    `## Required Secrets`,
    ...revision.requiredSecrets.map((secret) => `- ${secret}`),
    ``,
    `## Terraform Cloud`,
    `Workspace: ${revision.terraformCloudWorkspace}`,
    `State target: ${TERRAFORM_STATE_TARGET_PREFIX}/${config.slug}`,
    ``,
    `## Manual Review Checklist`,
    `- [ ] Repo refs, branches, and app paths are correct.`,
    `- [ ] Runtime commands match each component.`,
    `- [ ] Required provider secrets exist in GitHub Actions and Terraform Cloud.`,
    `- [ ] Database allocation is expected for this app.`,
    `- [ ] Cloudflare DNS points only at the generated app endpoint.`,
  ].join('\n')
}

export async function createGitHubInfraPr(
  client: GitHubInfraClient,
  request: InfraPrRequest,
): Promise<PullRequestResult> {
  return client.createPullRequest({
    repo: request.infraRepo,
    base: request.baseBranch,
    head: request.headBranch,
    title: request.revision.prTitle,
    body: request.revision.prBody,
    files: request.revision.files,
  })
}
