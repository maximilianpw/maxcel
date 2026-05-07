import { createFileRoute } from '@tanstack/react-router'
import { ProjectsHomePage } from '@/components/projects/home-page'
import { listProjects } from '@/platform/functions'

export const Route = createFileRoute('/')({
  loader: () => listProjects(),
  component: HomeRoute,
})

function HomeRoute() {
  const projects = Route.useLoaderData()

  return <ProjectsHomePage projects={projects} />
}
