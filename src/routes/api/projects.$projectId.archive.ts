import { createFileRoute } from '@tanstack/react-router'
import { archiveProject } from '../../platform/projects'

export const Route = createFileRoute('/api/projects/$projectId/archive')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const project = await archiveProject(params.projectId)
        return Response.json(project)
      },
    },
  },
})
