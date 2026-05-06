import { createFileRoute } from '@tanstack/react-router'
import { platformStore } from '../../platform/store'

export const Route = createFileRoute('/api/projects/$projectId/archive')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const project = await platformStore.archiveProject(params.projectId)
        return Response.json(project)
      },
    },
  },
})
