import { randomBytes, timingSafeEqual } from 'node:crypto'
import { isAllowedGitHubUser, loadGitHubAuthConfig } from './github'

export interface GitHubOAuthState {
  state: string
  codeVerifier: string
}

export function createGitHubOAuthState(): GitHubOAuthState {
  return {
    state: randomBytes(24).toString('base64url'),
    codeVerifier: randomBytes(32).toString('base64url'),
  }
}

export function buildGitHubOAuthUrl(
  callbackUrl: string,
  oauthState: GitHubOAuthState,
): string {
  const config = loadGitHubAuthConfig()
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', 'repo read:user user:email')
  url.searchParams.set('state', oauthState.state)
  return url.toString()
}

export function assertAllowedGitHubLogin(login: string): void {
  const config = loadGitHubAuthConfig()
  if (!isAllowedGitHubUser(login, config)) {
    throw new Error('GitHub user is not allowlisted for this personal platform')
  }
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}
