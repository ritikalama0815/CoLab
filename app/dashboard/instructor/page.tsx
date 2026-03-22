import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus, FolderKanban, Users, GitCommit,
  ArrowRight, MessageSquareWarning
} from "lucide-react"
import Link from "next/link"

export default async function InstructorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getCurrentProfile()

  if (profile?.role !== "instructor") redirect("/dashboard/student")

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("created_by", user!.id)
    .order("created_at", { ascending: false })

  const projectIds = (projects || []).map((p) => p.id)

  const { data: allGroups } = projectIds.length > 0
    ? await supabase
        .from("project_groups")
        .select("id, project_id, name, github_repo_url")
        .in("project_id", projectIds)
    : { data: [] }

  const groupIds = (allGroups || []).map((g) => g.id)

  const { count: totalStudents } = projectIds.length > 0
    ? await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .in("project_id", projectIds)
        .eq("role", "member")
    : { count: 0 }

  const { count: totalQuestions } = groupIds.length > 0
    ? await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .in("group_id", groupIds)
        .eq("resolved", false)
    : { count: 0 }

  const displayName = user?.user_metadata?.full_name || user?.email || "Instructor"

  // Group counts per project
  const groupCountMap: Record<string, number> = {}
  const studentCountMap: Record<string, number> = {}
  for (const g of allGroups || []) {
    groupCountMap[g.project_id] = (groupCountMap[g.project_id] || 0) + 1
  }

  if (projectIds.length > 0) {
    const { data: memberRows } = await supabase
      .from("memberships")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("role", "member")
    for (const m of memberRows || []) {
      studentCountMap[m.project_id] = (studentCountMap[m.project_id] || 0) + 1
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {displayName}</h1>
          <p className="mt-1 text-muted-foreground">Manage your projects and student groups.</p>
        </div>
        <Link href="/dashboard/instructor/projects/new">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStudents || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Groups</CardTitle>
            <GitCommit className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allGroups?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Questions</CardTitle>
            <MessageSquareWarning className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuestions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Project list */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Your Projects</h2>
        {(!projects || projects.length === 0) ? (
          <Card className="border-dashed border-primary/20 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="h-16 w-16 text-muted-foreground/40" />
              <h3 className="mt-4 text-xl font-medium">No projects yet</h3>
              <p className="mt-2 text-center text-muted-foreground">
                Create your first project to start managing student groups.
              </p>
              <Link href="/dashboard/instructor/projects/new" className="mt-6">
                <Button variant="gradient" className="gap-2">
                  <Plus className="h-4 w-4" /> Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/instructor/projects/${project.id}`}>
                <Card className="border-border/60 bg-card/80 transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{project.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
                      <Badge variant="secondary">
                        {groupCountMap[project.id] || 0} groups
                      </Badge>
                      <Badge variant="outline">
                        {studentCountMap[project.id] || 0} students
                      </Badge>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
