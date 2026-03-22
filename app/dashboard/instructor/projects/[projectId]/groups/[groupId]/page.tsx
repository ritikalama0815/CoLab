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
import { InstructorQuestionCard } from "@/components/instructor/instructor-question-card"
import { ReportGenerator } from "@/components/groups/report-generator"

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

  const { count: docsActivityCount, error: docsCountErr } = await supabase
    .from("docs_activity")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)

  const docsLogged = docsCountErr ? 0 : docsActivityCount ?? 0
  const hasReportData =
    (commits?.length ?? 0) > 0 ||
    (submissions?.length ?? 0) > 0 ||
    docsLogged > 0

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

      <ReportGenerator
        groupId={groupId}
        groupName={group.name}
        hasData={hasReportData}
        canViewReports
      />

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

        {/* Chat — private to students; @question posts appear below */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-muted-foreground" /> Group Chat</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Group chat is private to instructors, but when students use{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">@question</code>{" "}
              in chat, the question is copied here for you to answer.
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

        {/* Questions (from @question in student chat + any other entries) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-primary" /> Questions
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Students send these with <code className="rounded bg-muted px-1 font-mono">@question …</code> in group chat.
            </p>
          </CardHeader>
          <CardContent>
            {(!questions || questions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <InstructorQuestionCard
                    key={q.id}
                    projectId={projectId}
                    question={{
                      id: q.id,
                      group_id: q.group_id,
                      content: q.content,
                      answer: q.answer,
                      resolved: q.resolved,
                      created_at: q.created_at,
                      profiles: q.profiles as { full_name: string | null; email: string | null } | null,
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
