import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArchiveIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  GitPullRequestIcon,
  KeyRoundIcon,
  PlayIcon,
  PlusIcon,
  ServerIcon,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  archiveProject,
  createProjectDraft,
  generateInfraPr,
  listProjects,
} from '@/platform/functions'
import type {
  EnvVarInput,
  ProjectDraftInput,
  ProjectRecord,
} from '@/platform/types'

export const Route = createFileRoute('/')({
  loader: () => listProjects(),
  component: Home,
})

const defaults = {
  name: 'Launchpad API',
  slug: 'launchpad-api',
  frontendRepo: 'maxpw/launchpad',
  frontendPath: 'apps/web',
  frontendBuild: 'npm ci && npm run build',
  frontendOutput: 'dist',
  backendRepo: 'maxpw/launchpad-api',
  backendPath: '.',
  backendBuild: 'npm ci && npm run build',
  backendRun: 'node dist/server/index.mjs',
  branch: 'main',
  env: 'PUBLIC_API_URL=https://launchpad-api.maximilian.pw\nSESSION_SECRET=replace-me',
}

function Home() {
  const initialProjects = Route.useLoaderData()
  const router = useRouter()
  const createDraft = useServerFn(createProjectDraft)
  const generatePr = useServerFn(generateInfraPr)
  const archive = useServerFn(archiveProject)
  const [projects, setProjects] = useState(initialProjects)
  const [form, setForm] = useState(defaults)
  const [includeBackend, setIncludeBackend] = useState(true)
  const [databaseNeeded, setDatabaseNeeded] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitProject() {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      try {
        const project = await createDraft({
          data: toDraft(form, includeBackend, databaseNeeded),
        })
        const revision = await generatePr({ data: { projectId: project.id } })
        setProjects(await listProjects())
        await router.invalidate()
        setStatus(
          `Generated ${revision.files.length} infra files for ${project.config.domain}.`,
        )
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Project creation failed',
        )
      }
    })
  }

  function generateProjectPr(project: ProjectRecord) {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      try {
        const revision = await generatePr({ data: { projectId: project.id } })
        setProjects(await listProjects())
        await router.invalidate()
        setStatus(`Opened review workflow for ${revision.projectSlug}.`)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Infra PR generation failed',
        )
      }
    })
  }

  function archiveExistingProject(project: ProjectRecord) {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      try {
        await archive({ data: { projectId: project.id } })
        setProjects(await listProjects())
        await router.invalidate()
        setStatus(`Archived ${project.config.slug}.`)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Archive failed')
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
          <Card>
            <CardHeader>
              <CardTitle>Create Project</CardTitle>
              <CardDescription>
                Define repo refs, runtime commands, env vars, domain slug, and
                database isolation.
              </CardDescription>
              <CardAction>
                <Button onClick={submitProject} disabled={isPending}>
                  <PlusIcon data-icon="inline-start" />
                  Generate PR
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="project">
                <TabsList>
                  <TabsTrigger value="project">Project</TabsTrigger>
                  <TabsTrigger value="components">Components</TabsTrigger>
                  <TabsTrigger value="env">Env</TabsTrigger>
                </TabsList>

                <TabsContent value="project" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Project name">
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setFormValue(setForm, 'name', event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Domain slug">
                      <Input
                        value={form.slug}
                        onChange={(event) =>
                          setFormValue(setForm, 'slug', event.target.value)
                        }
                      />
                    </Field>
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2">
                      <div className="text-muted-foreground">
                        Generated domain
                      </div>
                      <div className="mt-1 font-medium">
                        {form.slug || 'project'}.maximilian.pw
                      </div>
                    </div>
                    <label className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                      <Checkbox
                        checked={databaseNeeded}
                        onCheckedChange={(checked) =>
                          setDatabaseNeeded(checked === true)
                        }
                      />
                      <span>
                        Allocate a database/user on the shared DigitalOcean
                        Postgres cluster
                      </span>
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="components" className="pt-4">
                  <div className="grid gap-5">
                    <ComponentFields
                      title="Frontend"
                      repo={form.frontendRepo}
                      path={form.frontendPath}
                      build={form.frontendBuild}
                      output={form.frontendOutput}
                      branch={form.branch}
                      onRepo={(value) =>
                        setFormValue(setForm, 'frontendRepo', value)
                      }
                      onPath={(value) =>
                        setFormValue(setForm, 'frontendPath', value)
                      }
                      onBuild={(value) =>
                        setFormValue(setForm, 'frontendBuild', value)
                      }
                      onOutput={(value) =>
                        setFormValue(setForm, 'frontendOutput', value)
                      }
                      onBranch={(value) =>
                        setFormValue(setForm, 'branch', value)
                      }
                    />
                    <Separator />
                    <label className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={includeBackend}
                        onCheckedChange={(checked) =>
                          setIncludeBackend(checked === true)
                        }
                      />
                      <span>Include backend service</span>
                    </label>
                    {includeBackend ? (
                      <ComponentFields
                        title="Backend"
                        repo={form.backendRepo}
                        path={form.backendPath}
                        build={form.backendBuild}
                        run={form.backendRun}
                        branch={form.branch}
                        onRepo={(value) =>
                          setFormValue(setForm, 'backendRepo', value)
                        }
                        onPath={(value) =>
                          setFormValue(setForm, 'backendPath', value)
                        }
                        onBuild={(value) =>
                          setFormValue(setForm, 'backendBuild', value)
                        }
                        onRun={(value) =>
                          setFormValue(setForm, 'backendRun', value)
                        }
                        onBranch={(value) =>
                          setFormValue(setForm, 'branch', value)
                        }
                      />
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="env" className="pt-4">
                  <Field label="Environment variables">
                    <Textarea
                      className="min-h-36 font-mono text-xs"
                      value={form.env}
                      onChange={(event) =>
                        setFormValue(setForm, 'env', event.target.value)
                      }
                    />
                  </Field>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Values are treated as encrypted platform secrets. Use
                    KEY=value, one per line.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control Plane Surface</CardTitle>
              <CardDescription>
                V1 objects and review gates generated for each onboarded
                project.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <SurfaceItem
                icon={<GitBranchIcon className="size-4" />}
                title="Repo refs"
                value="GitHub owner/repo, branch, and app path per component"
              />
              <SurfaceItem
                icon={<GitPullRequestIcon className="size-4" />}
                title="Infra PR"
                value="Plain HCL plus GitHub Actions workflow in a dedicated infra repo"
              />
              <SurfaceItem
                icon={<KeyRoundIcon className="size-4" />}
                title="Secret storage"
                value="AES-256-GCM platform encryption with a required server key"
              />
              <SurfaceItem
                icon={<PlayIcon className="size-4" />}
                title="Deploy status"
                value="PR review, Terraform Cloud state, and provider status tracked back to the app"
              />
            </CardContent>
          </Card>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ComponentFields(props: {
  title: string
  repo: string
  path: string
  build: string
  output?: string
  run?: string
  branch: string
  onRepo: (value: string) => void
  onPath: (value: string) => void
  onBuild: (value: string) => void
  onOutput?: (value: string) => void
  onRun?: (value: string) => void
  onBranch: (value: string) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{props.title}</h2>
        <Badge variant="outline">{props.branch}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="GitHub repo">
          <Input
            value={props.repo}
            onChange={(event) => props.onRepo(event.target.value)}
          />
        </Field>
        <Field label="Branch">
          <Input
            value={props.branch}
            onChange={(event) => props.onBranch(event.target.value)}
          />
        </Field>
        <Field label="App path">
          <Input
            value={props.path}
            onChange={(event) => props.onPath(event.target.value)}
          />
        </Field>
        <Field label="Build command">
          <Input
            value={props.build}
            onChange={(event) => props.onBuild(event.target.value)}
          />
        </Field>
        {props.onOutput ? (
          <Field label="Output directory">
            <Input
              value={props.output ?? ''}
              onChange={(event) => props.onOutput?.(event.target.value)}
            />
          </Field>
        ) : null}
        {props.onRun ? (
          <Field label="Start command">
            <Input
              value={props.run ?? ''}
              onChange={(event) => props.onRun?.(event.target.value)}
            />
          </Field>
        ) : null}
      </div>
    </div>
  )
}

function SurfaceItem(props: {
  icon: React.ReactNode
  title: string
  value: string
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-3">
      <div className="mt-0.5 text-muted-foreground">{props.icon}</div>
      <div>
        <div className="font-medium">{props.title}</div>
        <div className="text-muted-foreground">{props.value}</div>
      </div>
    </div>
  )
}

function ProjectsTable(props: {
  projects: ProjectRecord[]
  pending: boolean
  onGenerate: (project: ProjectRecord) => void
  onArchive: (project: ProjectRecord) => void
}) {
  if (props.projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No projects yet. Create the first draft to generate Terraform and a
        review PR.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Components</TableHead>
          <TableHead>PR</TableHead>
          <TableHead>Deploy</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <div className="font-medium">{project.config.name}</div>
              <div className="text-xs text-muted-foreground">
                {project.config.domain}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {project.config.components.map((component) => (
                  <Badge key={component.kind} variant="outline">
                    {component.kind}
                  </Badge>
                ))}
                {project.config.database ? (
                  <Badge variant="secondary">postgres</Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={project.prStatus === 'open' ? 'default' : 'outline'}
              >
                {project.prStatus}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{project.deployStatus}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={props.pending}
                  onClick={() => props.onGenerate(project)}
                >
                  <GitPullRequestIcon data-icon="inline-start" />
                  PR
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={props.pending || project.archivedAt !== null}
                  onClick={() => props.onArchive(project)}
                >
                  <ArchiveIcon data-icon="inline-start" />
                  Archive
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function toDraft(
  form: typeof defaults,
  includeBackend: boolean,
  databaseNeeded: boolean,
): ProjectDraftInput {
  return {
    name: form.name,
    slug: form.slug,
    frontend: {
      repo: {
        repo: form.frontendRepo,
        branch: form.branch,
        path: form.frontendPath,
      },
      buildCommand: form.frontendBuild,
      outputDirectory: form.frontendOutput,
    },
    backend: includeBackend
      ? {
          repo: {
            repo: form.backendRepo,
            branch: form.branch,
            path: form.backendPath,
          },
          buildCommand: form.backendBuild,
          runCommand: form.backendRun,
        }
      : null,
    databaseNeeded,
    env: parseEnv(form.env),
  }
}

function parseEnv(value: string): EnvVarInput[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=')
      return {
        key: index === -1 ? line : line.slice(0, index),
        value: index === -1 ? '' : line.slice(index + 1),
        secret: true,
      }
    })
}

function setFormValue(
  setForm: React.Dispatch<React.SetStateAction<typeof defaults>>,
  key: keyof typeof defaults,
  value: string,
) {
  setForm((current) => ({ ...current, [key]: value }))
}
