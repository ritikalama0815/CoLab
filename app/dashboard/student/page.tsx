import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FolderKanban, ArrowRight, Users, Settings, GraduationCap
} from "lucide-react"
import Link from "next/link"
import { getGroupColor } from "@/lib/group-colors"

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getCurrentProfile()

  if (profile?.role === "instructor") redirect("/dashboard/instructor")

  const { data: memberships } = await supabase
    .from("memberships")
    .select(`
      id, group_id, role, joined_at,
      projects ( id, name, description ),
      project_groups ( id, name, sort_order )
    `)
    .eq("user_id", user!.id)
    .eq("role", "member")

  const groups = (memberships || []).filter((m) => m.group_id)
  const displayName = user?.user_metadata?.full_name || user?.email || "Student"

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hey, {displayName}</h1>
        <p className="mt-1 text-muted-foreground">Here are your group portals.</p>
      </div>

      {!profile?.github_username && (
        <Card className="border-[var(--warning)]/20 bg-[var(--warning)]/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Settings className="h-5 w-5 text-[var(--warning)]" />
            <div className="flex-1">
              <p className="font-medium">Set up your GitHub username</p>
              <p className="text-sm text-muted-foreground">So your commits are tracked automatically.</p>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm">Settings</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card className="border-dashed border-primary/20 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="mt-4 text-xl font-medium">No groups yet</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Your instructor will add you to a project group. Check back soon!
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Waiting for your teacher to add you
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((m) => {
            const project = m.projects as { id: string; name: string; description: string | null } | null
            const group = m.project_groups as { id: string; name: string; sort_order: number | null } | null
            const gColor = getGroupColor(group?.sort_order ?? 0)
            return (
              <Link key={m.id} href={`/dashboard/student/groups/${m.group_id}`}>
                <Card className={`${gColor.border} border-l-4 bg-card/80 transition-all hover:shadow-md`}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${gColor.bgSubtle}`}>
                      <FolderKanban className={`h-5 w-5 ${gColor.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{group?.name || "Group"}</p>
                        <Badge variant="secondary" className="text-[10px]">{project?.name}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {project?.description || "No description"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
