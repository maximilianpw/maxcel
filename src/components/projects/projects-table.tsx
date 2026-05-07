import { ArchiveIcon, GitPullRequestIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PR_STATUS } from '@/platform/constants'
import type { ProjectRecord } from '@/platform/types'

export function ProjectsTable({
  projects,
  pending,
  onGenerate,
  onArchive,
}: {
  projects: ProjectRecord[]
  pending: boolean
  onGenerate: (project: ProjectRecord) => void
  onArchive: (project: ProjectRecord) => void
}) {
  if (projects.length === 0) {
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
        {projects.map((project) => (
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
                variant={
                  project.prStatus === PR_STATUS.OPEN ? 'default' : 'outline'
                }
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
                  disabled={pending}
                  onClick={() => onGenerate(project)}
                >
                  <GitPullRequestIcon data-icon="inline-start" />
                  PR
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending || project.archivedAt !== null}
                  onClick={() => onArchive(project)}
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
