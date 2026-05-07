export const DOMAIN_ROOT = 'maximilian.pw'
export const DEFAULT_BRANCH = 'main'

export const COMPONENT_KIND = {
  FRONTEND: 'frontend',
  BACKEND: 'backend',
} as const
export const COMPONENT_KINDS = Object.values(COMPONENT_KIND)

export const DEPLOY_STATUS = {
  IDLE: 'idle',
  PLANNING: 'planning',
  WAITING_REVIEW: 'waiting_review',
  DEPLOYING: 'deploying',
  READY: 'ready',
  FAILED: 'failed',
} as const
export const DEPLOY_STATUSES = Object.values(DEPLOY_STATUS)

export const PR_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const
export const PR_STATUSES = Object.values(PR_STATUS)

export const PROVIDER_ID = {
  GITHUB: 'github',
  DIGITALOCEAN: 'digitalocean',
  CLOUDFLARE: 'cloudflare',
  TERRAFORM_CLOUD: 'terraform_cloud',
} as const
export const PROVIDER_IDS = Object.values(PROVIDER_ID)

export const PLATFORM_RESOURCE_PREFIX = 'maxcel'
export const SHARED_POSTGRES_CLUSTER_NAME = `${PLATFORM_RESOURCE_PREFIX}-shared-v1`

export const DIGITALOCEAN_REGION = 'nyc'
export const DIGITALOCEAN_SERVICE_INSTANCE_SIZE = 'basic-xxs'

export const TERRAFORM_CLOUD_ORG_GH_SECRET = 'TF_CLOUD_ORGANIZATION'
export const TERRAFORM_STATE_TARGET_PREFIX = 'app'
export const TERRAFORM_VARIABLES = {
  CLOUD_ORGANIZATION: 'terraform_cloud_organization',
  DIGITALOCEAN_TOKEN: 'digitalocean_token',
  CLOUDFLARE_API_TOKEN: 'cloudflare_api_token',
  CLOUDFLARE_ZONE_ID: 'cloudflare_zone_id',
} as const

export const REQUIRED_PROVIDER_SECRET_NAMES = [
  'DIGITALOCEAN_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'TF_API_TOKEN',
] as const

export function platformResourceName(slug: string): string {
  return `${PLATFORM_RESOURCE_PREFIX}-${slug}`
}
