import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2Icon, ServerIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  archiveProject,
  createProjectDraft,
  generateInfraPr,
} from '@/platform/functions'
import type { ProjectDraftInput, ProjectRecord } from '@/platform/types'
import { ProjectDraftForm } from './project-draft-form'
import { ProjectSurface } from './project-surface'
import { ProjectsTable } from './projects-table'

export function ProjectsHomePage({ projects }: { projects: ProjectRecord[] }) {
  const router = useRouter()
  const createDraft = useServerFn(createProjectDraft)
  const generatePr = useServerFn(generateInfraPr)
  const archive = useServerFn(archiveProject)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitProject(draft: ProjectDraftInput) {
    runProjectAction(async () => {
      const project = await createDraft({ data: draft })
      const revision = await generatePr({ data: { projectId: project.id } })
      await router.invalidate({ sync: true })
      setStatus(
        `Generated ${revision.files.length} infra files for ${project.config.domain}.`,
      )
    }, 'Project creation failed')
  }

  function generateProjectPr(project: ProjectRecord) {
    runProjectAction(async () => {
      const revision = await generatePr({ data: { projectId: project.id } })
      await router.invalidate({ sync: true })
      setStatus(`Opened review workflow for ${revision.projectSlug}.`)
    }, 'Infra PR generation failed')
  }

  function archiveExistingProject(project: ProjectRecord) {
    runProjectAction(async () => {
      await archive({ data: { projectId: project.id } })
      await router.invalidate({ sync: true })
      setStatus(`Archived ${project.config.slug}.`)
    }, 'Archive failed')
  }

  function runProjectAction(action: () => Promise<void>, fallback: string) {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      try {
        await action()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : fallback)
      }
    })
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ServerIcon className="size-5" />
              <h1 className="text-2xl font-semibold tracking-normal">
                Maxcel Deployments
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Onboard GitHub apps, generate reviewable Terraform, and route them
              under maximilian.pw.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">GitHub only</Badge>
            <Badge variant="secondary">DigitalOcean App Platform</Badge>
            <Badge variant="secondary">Cloudflare DNS</Badge>
          </div>
        </header>

        {status ? (
          <Alert>
            <CheckCircle2Icon className="size-4" />
            <AlertTitle>Workflow updated</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <ProjectDraftForm pending={isPending} onSubmit={submitProject} />
          <ProjectSurface />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Local server state for created drafts and generated infra
              revisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectsTable
              projects={projects}
              pending={isPending}
              onGenerate={generateProjectPr}
              onArchive={archiveExistingProject}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
