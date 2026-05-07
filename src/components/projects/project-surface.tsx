import {
  GitBranchIcon,
  GitPullRequestIcon,
  KeyRoundIcon,
  PlayIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ReactNode } from 'react'

export function ProjectSurface() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Control Plane Surface</CardTitle>
        <CardDescription>
          V1 objects and review gates generated for each onboarded project.
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
  )
}

function SurfaceItem({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">{value}</div>
      </div>
    </div>
  )
}
