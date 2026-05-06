import { createFileRoute } from '@tanstack/react-router'
import {
  buildGitHubOAuthUrl,
  createGitHubOAuthState,
} from '../../platform/auth'

export const Route = createFileRoute('/api/auth/github')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const callbackUrl = new URL('/api/auth/github/callback', request.url)
        const oauthState = createGitHubOAuthState()
        return Response.redirect(
          buildGitHubOAuthUrl(callbackUrl.toString(), oauthState),
          302,
        )
      },
    },
  },
})
