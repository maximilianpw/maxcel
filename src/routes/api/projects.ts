import { createFileRoute } from '@tanstack/react-router'
import { createProjectDraft, listProjects } from '../../platform/projects'

export const Route = createFileRoute('/api/projects')({
  server: {
    handlers: {
      GET: async () => Response.json(await listProjects()),
      POST: async ({ request }) => {
        const body = await request.json()
        const project = await createProjectDraft(body)
        return Response.json(project, { status: 201 })
      },
    },
  },
})
