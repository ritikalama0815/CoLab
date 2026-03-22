import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth/profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Users, GitCommit, MessageSquare,
  FileUp, MessageSquareWarning
} from "lucide-react"
import Link from "next/link"
import { getGroupColor } from "@/lib/group-colors"

interface Props {
  params: Promise<{ projectId: string; groupId: string }>
}

export default async function InstructorGroupPage({ params }: Props) {
  const { projectId, groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getCurrentProfile()
  if (profile?.role !== "instructor") redirect("/dashboard/student")

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()
  if (!project || project.created_by !== user?.id) notFound()

  const { data: group } = await supabase
    .from("project_groups")
    .select("*")
    .eq("id", groupId)
    .single()
  if (!group) notFound()

  const { data: members } = await supabase
    .from("memberships")
    .select("*, profiles ( full_name, email, github_username )")
    .eq("group_id", groupId)
    .eq("role", "member")

  const { data: commits } = await supabase
    .from("commits")
    .select("*")
    .eq("group_id", groupId)
    .order("committed_at", { ascending: false })
    .limit(20)

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_submitted_by_fkey ( full_name, email )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  const { data: questions } = await supabase
    .from("questions")
    .select("*, profiles!questions_asked_by_fkey ( full_name, email )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  const gColor = getGroupColor(group.sort_order ?? 0)

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/instructor/projects/${projectId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${gColor.bg}`} />
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <Badge variant="secondary">{project.name}</Badge>
          </div>
          <p className="text-muted-foreground">
            {(members || []).length} members
            {group.github_repo_url && " · GitHub connected"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex items-center gap-3 py-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{(members || []).length}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex items-center gap-3 py-3">
            <GitCommit className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{(commits || []).length}</p>
              <p className="text-xs text-muted-foreground">Commits</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex items-center gap-3 py-3">
            <FileUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{(submissions || []).length}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex items-center gap-3 py-3">
            <MessageSquareWarning className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{(questions || []).filter((q) => !q.resolved).length}</p>
              <p className="text-xs text-muted-foreground">Open Questions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(members || []).map((m) => {
              const p = m.profiles as { full_name: string | null; email: string | null; github_username: string | null } | null
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${gColor.bgSubtle} text-xs font-medium ${gColor.text}`}>
                    {(p?.full_name || p?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p?.full_name || p?.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{p?.github_username || "no GitHub"}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Chat — private to students */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-muted-foreground" /> Group Chat</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Group chat is private to students. Messages are not visible to instructors.
            </p>
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" /> Submissions</CardTitle></CardHeader>
          <CardContent>
            {(!submissions || submissions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => (
                  <div key={s.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{s.link_url}</a>}
                    {s.file_url && <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Download file</a>}
                    {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-primary" /> Questions</CardTitle></CardHeader>
          <CardContent>
            {(!questions || questions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{q.content}</p>
                      {q.resolved && <Badge variant="secondary" className="text-[10px]">Resolved</Badge>}
                    </div>
                    {q.answer && <p className="mt-1 rounded bg-primary/5 p-2 text-sm text-primary">{q.answer}</p>}
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
