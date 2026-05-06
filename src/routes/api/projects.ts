import { createFileRoute } from '@tanstack/react-router'
import { platformStore } from '../../platform/store'
import { validateProjectDraft } from '../../platform/validation'

export const Route = createFileRoute('/api/projects')({
  server: {
    handlers: {
      GET: async () => Response.json(await platformStore.listProjects()),
      POST: async ({ request }) => {
        const body = await request.json()
        const config = validateProjectDraft(body)
        const project = await platformStore.createProject(config)
        return Response.json(project, { status: 201 })
      },
    },
  },
})
