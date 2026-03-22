import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth/profile"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Users, FolderKanban, ArrowRight,
  Settings, MessageSquareWarning, FileUp
} from "lucide-react"
import Link from "next/link"
import { getGroupColor, groupColorDot } from "@/lib/group-colors"

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getCurrentProfile()
  if (profile?.role !== "instructor") redirect("/dashboard/student")

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (error || !project || project.created_by !== user?.id) notFound()

  const { data: groups } = await supabase
    .from("project_groups")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")

  const { data: members } = await supabase
    .from("memberships")
    .select(`
      id, user_id, group_id, role, joined_at,
      profiles ( id, full_name, email, github_username )
    `)
    .eq("project_id", projectId)

  const students = (members || []).filter((m) => m.role === "member")

  const groupIds = (groups || []).map((g) => g.id)

  const { data: questions } = groupIds.length > 0
    ? await supabase
        .from("questions")
        .select("*, profiles!questions_asked_by_fkey ( full_name, email )")
        .in("group_id", groupIds)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] }

  const { data: submissions } = groupIds.length > 0
    ? await supabase
        .from("submissions")
        .select("*, profiles!submissions_submitted_by_fkey ( full_name, email )")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] }

  const groupNameMap: Record<string, string> = {}
  const groupIndexMap: Record<string, number> = {}
  for (let i = 0; i < (groups || []).length; i++) {
    const g = groups![i]
    groupNameMap[g.id] = g.name
    groupIndexMap[g.id] = i
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/instructor">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description || "No description"}</p>
          </div>
        </div>
        <Link href={`/dashboard/instructor/projects/${projectId}/settings`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      {/* Sub-groups */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Groups</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(groups || []).map((group, gi) => {
            const groupStudents = students.filter((s) => s.group_id === group.id)
            const color = getGroupColor(gi)
            return (
              <Link key={group.id} href={`/dashboard/instructor/projects/${projectId}/groups/${group.id}`}>
                <Card className={`${color.border} border-l-4 bg-card/80 transition-all hover:shadow-md h-full`}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color.bgSubtle}`}>
                      <FolderKanban className={`h-5 w-5 ${color.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{groupStudents.length} students</p>
                    </div>
                    {group.github_repo_url && (
                      <Badge variant="secondary" className="text-[10px]">GitHub</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Student roster */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Student Roster
          </CardTitle>
          <CardDescription>{students.length} students enrolled</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students added yet.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>Student</span>
                <span>Group</span>
                <span>GitHub</span>
              </div>
              {students.map((m) => {
                const p = m.profiles as { full_name: string | null; email: string | null; github_username: string | null } | null
                const gIdx = m.group_id ? groupIndexMap[m.group_id] ?? 0 : -1
                const gColor = gIdx >= 0 ? getGroupColor(gIdx) : null
                return (
                  <div key={m.id} className={`grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b border-border/50 px-4 py-2 last:border-0 ${gColor ? `border-l-2 ${gColor.border}` : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p?.full_name || p?.email || "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground">{p?.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {gColor && <span style={groupColorDot(gIdx, 8)} />}
                      <Badge variant="outline" className={`w-fit text-xs ${gColor ? gColor.text : ""}`}>
                        {m.group_id ? groupNameMap[m.group_id] || "—" : "Unassigned"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{p?.github_username || "—"}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two columns: Questions + Submissions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-primary" /> Open Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!questions || questions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No open questions.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q: Record<string, unknown>) => (
                  <div key={q.id as string} className="rounded-lg border border-border p-3">
                    <p className="text-sm">{q.content as string}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(q.profiles as Record<string, unknown>)?.full_name as string || (q.profiles as Record<string, unknown>)?.email as string}</span>
                      <span>·</span>
                      <Badge variant="outline" className={`text-[10px] ${(q.group_id as string) in groupIndexMap ? getGroupColor(groupIndexMap[q.group_id as string]).text : ""}`}>
                        <span style={groupColorDot(groupIndexMap[q.group_id as string] ?? 0, 6)} className="mr-1" />
                        {groupNameMap[q.group_id as string] || "—"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" /> Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!submissions || submissions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((s: Record<string, unknown>) => (
                  <div key={s.id as string} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{s.title as string}</p>
                    {(s.link_url as string) && (
                      <a href={s.link_url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        {s.link_url as string}
                      </a>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(s.profiles as Record<string, unknown>)?.full_name as string || (s.profiles as Record<string, unknown>)?.email as string}</span>
                      <span>·</span>
                      <Badge variant="outline" className={`text-[10px] ${(s.group_id as string) in groupIndexMap ? getGroupColor(groupIndexMap[s.group_id as string]).text : ""}`}>
                        <span style={groupColorDot(groupIndexMap[s.group_id as string] ?? 0, 6)} className="mr-1" />
                        {groupNameMap[s.group_id as string] || "—"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
