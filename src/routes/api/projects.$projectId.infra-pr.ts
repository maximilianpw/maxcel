import { createFileRoute } from '@tanstack/react-router'
import { generateInfraPr } from '../../platform/projects'

export const Route = createFileRoute('/api/projects/$projectId/infra-pr')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const revision = await generateInfraPr(params.projectId)
        return Response.json(revision, { status: 201 })
      },
    },
  },
})
