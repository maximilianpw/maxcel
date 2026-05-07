import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { ProjectDraftInput } from '@/platform/types'
import { defaultProjectDraftForm, formToProjectDraft } from './project-draft'
import type { ReactNode } from 'react'
import type {
  ProjectComponentField,
  ProjectComponentForm,
  ProjectComponentKey,
  ProjectDraftFormState,
  ProjectField,
  ProjectSetting,
} from './project-draft'

export function ProjectDraftForm({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (draft: ProjectDraftInput) => void
}) {
  const [form, setForm] = useState(defaultProjectDraftForm)

  function updateProjectField(field: ProjectField, value: string) {
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        [field]: value,
      },
    }))
  }

  function updateSetting(field: ProjectSetting, value: boolean) {
    setForm((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value,
      },
    }))
  }

  function updateComponentField(
    componentKey: ProjectComponentKey,
    field: ProjectComponentField,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      components: {
        ...current.components,
        [componentKey]: {
          ...current.components[componentKey],
          [field]: value,
        },
      },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>
          Define repo refs, runtime commands, env vars, domain slug, and
          database isolation.
        </CardDescription>
        <CardAction>
          <Button
            onClick={() => onSubmit(formToProjectDraft(form))}
            disabled={pending}
          >
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
            <ProjectFields
              form={form}
              onProjectChange={updateProjectField}
              onSettingChange={updateSetting}
            />
          </TabsContent>

          <TabsContent value="components" className="pt-4">
            <div className="grid gap-5">
              <ComponentFields
                componentKey="frontend"
                component={form.components.frontend}
                onChange={updateComponentField}
              />
              <Separator />
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={form.settings.includeBackend}
                  onCheckedChange={(checked) =>
                    updateSetting('includeBackend', checked === true)
                  }
                />
                <span>Include backend service</span>
              </label>
              {form.settings.includeBackend ? (
                <ComponentFields
                  componentKey="backend"
                  component={form.components.backend}
                  onChange={updateComponentField}
                />
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="env" className="pt-4">
            <Field label="Environment variables">
              <Textarea
                className="min-h-36 font-mono text-xs"
                value={form.project.env}
                onChange={(event) =>
                  updateProjectField('env', event.target.value)
                }
              />
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              Values are treated as encrypted platform secrets. Use KEY=value,
              one per line.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ProjectFields({
  form,
  onProjectChange,
  onSettingChange,
}: {
  form: ProjectDraftFormState
  onProjectChange: (field: ProjectField, value: string) => void
  onSettingChange: (field: ProjectSetting, value: boolean) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Project name">
        <Input
          value={form.project.name}
          onChange={(event) => onProjectChange('name', event.target.value)}
        />
      </Field>
      <Field label="Domain slug">
        <Input
          value={form.project.slug}
          onChange={(event) => onProjectChange('slug', event.target.value)}
        />
      </Field>
      <div className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2">
        <div className="text-muted-foreground">Generated domain</div>
        <div className="mt-1 font-medium">
          {form.project.slug || 'project'}.maximilian.pw
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
        <Checkbox
          checked={form.settings.databaseNeeded}
          onCheckedChange={(checked) =>
            onSettingChange('databaseNeeded', checked === true)
          }
        />
        <span>
          Allocate a database/user on the shared DigitalOcean Postgres cluster
        </span>
      </label>
    </div>
  )
}

function ComponentFields({
  componentKey,
  component,
  onChange,
}: {
  componentKey: ProjectComponentKey
  component: ProjectComponentForm
  onChange: (
    componentKey: ProjectComponentKey,
    field: ProjectComponentField,
    value: string,
  ) => void
}) {
  const title = componentKey === 'frontend' ? 'Frontend' : 'Backend'

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Badge variant="outline">{component.branch}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="GitHub repo">
          <Input
            value={component.repo}
            onChange={(event) =>
              onChange(componentKey, 'repo', event.target.value)
            }
          />
        </Field>
        <Field label="Branch">
          <Input
            value={component.branch}
            onChange={(event) =>
              onChange(componentKey, 'branch', event.target.value)
            }
          />
        </Field>
        <Field label="App path">
          <Input
            value={component.path}
            onChange={(event) =>
              onChange(componentKey, 'path', event.target.value)
            }
          />
        </Field>
        <Field label="Build command">
          <Input
            value={component.buildCommand}
            onChange={(event) =>
              onChange(componentKey, 'buildCommand', event.target.value)
            }
          />
        </Field>
        {componentKey === 'frontend' ? (
          <Field label="Output directory">
            <Input
              value={component.outputDirectory}
              onChange={(event) =>
                onChange(componentKey, 'outputDirectory', event.target.value)
              }
            />
          </Field>
        ) : null}
        {componentKey === 'backend' ? (
          <Field label="Start command">
            <Input
              value={component.runCommand}
              onChange={(event) =>
                onChange(componentKey, 'runCommand', event.target.value)
              }
            />
          </Field>
        ) : null}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
