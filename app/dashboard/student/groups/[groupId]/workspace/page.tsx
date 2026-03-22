import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { GroupWorkspace } from "@/components/student/group-workspace"

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function WorkspacePage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data: group } = await supabase
    .from("project_groups")
    .select("*, projects ( id, name, description )")
    .eq("id", groupId)
    .single()

  if (!group) notFound()

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) notFound()

  const { data: resources } = await supabase
    .from("resources")
    .select("*, profiles!resources_added_by_fkey ( full_name )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("group_id", groupId)
    .order("priority", { ascending: true })

  const { data: memberRows } = await supabase.rpc("get_group_member_emails", {
    p_group_id: groupId,
  })

  const project = group.projects as { name: string } | null
  const emails = (memberRows || [])
    .map((m: { email: string | null }) => m.email)
    .filter((e: string | null): e is string => Boolean(e))

  return (
    <GroupWorkspace
      groupId={groupId}
      userId={user.id}
      groupName={group.name}
      projectName={project?.name || "Project"}
      resources={resources || []}
      todos={todos || []}
      memberEmails={emails}
    />
  )
}
