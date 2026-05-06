import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/auth/github/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        return Response.json({
          codeReceived: Boolean(url.searchParams.get('code')),
          stateReceived: Boolean(url.searchParams.get('state')),
          next: 'Exchange the code server-side, assert the allowlisted login, then issue an HttpOnly session cookie.',
        })
      },
    },
  },
})
