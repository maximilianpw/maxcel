import { createFileRoute } from '@tanstack/react-router'
import { platformStore } from '../../platform/store'

export const Route = createFileRoute('/api/projects/$projectId/infra-pr')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const revision = await platformStore.generateInfraRevision(
          params.projectId,
        )
        return Response.json(revision, { status: 201 })
      },
    },
  },
})
