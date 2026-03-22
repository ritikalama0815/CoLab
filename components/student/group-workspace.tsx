"use client"

import { ResourceThumbnailGrid, type ResourceThumbnailItem } from "./resource-thumbnail-grid"
import { WorkspaceMyTodos } from "./workspace-my-todos"
import { Briefcase, Link2, ListTodo } from "lucide-react"

interface TodoRow {
  id: string
  group_id: string
  title: string
  description: string | null
  assigned_to: string | null
  phase: string | null
  priority: number
  status: "pending" | "in_progress" | "done"
  color: string | null
  created_by: string | null
  ai_generated: boolean
  created_at: string
  updated_at: string
}

interface GroupWorkspaceProps {
  groupId: string
  userId: string
  groupName: string
  projectName: string
  resources: ResourceThumbnailItem[]
  todos: TodoRow[]
  memberEmails: string[]
}

export function GroupWorkspace({
  groupId,
  userId,
  groupName,
  projectName,
  resources,
  todos,
  memberEmails,
}: GroupWorkspaceProps) {
  const portalHref = `/dashboard/student/groups/${groupId}`

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-8 pb-2">
      {/* Page intro */}
      <header className="shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-card/60 shadow-sm ring-1 ring-border/20">
        <div className="bg-linear-to-br from-primary/7 via-transparent to-violet-500/6 px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner ring-1 ring-primary/20">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Workspace
                </p>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {groupName}
                </h1>
                <p className="text-sm text-muted-foreground">{projectName}</p>
              </div>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-right">
              Your links and your assignments in one place. Add or edit group resources in{" "}
              <a
                href={portalHref}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Portal
              </a>
              .
            </p>
          </div>
        </div>
      </header>

      {/* Main grid: resources + tasks */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
        {/* Resources — wider */}
        <section className="flex min-h-0 flex-col gap-4 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Shared resources</h2>
                <p className="text-[12px] text-muted-foreground">
                  {resources.length === 0
                    ? "No links yet"
                    : `${resources.length} link${resources.length === 1 ? "" : "s"} · opens in a new tab`}
                </p>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 rounded-2xl border border-border/40 bg-card/30 p-4 shadow-xs ring-1 ring-border/25 sm:p-5">
            <ResourceThumbnailGrid
              resources={resources}
              memberEmails={memberEmails}
              portalHref={portalHref}
            />
          </div>
        </section>

        {/* My tasks */}
        <section className="flex min-h-0 flex-col gap-4 lg:col-span-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">My tasks</h2>
              <p className="text-[12px] text-muted-foreground">
                Assigned to you in this group
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-xs ring-1 ring-border/25">
            <WorkspaceMyTodos
              groupId={groupId}
              userId={userId}
              initialTodos={todos}
              portalHref={portalHref}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
