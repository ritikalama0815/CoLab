import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { GroupPortal } from "@/components/student/group-portal"

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function StudentGroupPortalPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: group } = await supabase
    .from("project_groups")
    .select("*, projects ( id, name, description, created_by )")
    .eq("id", groupId)
    .single()

  if (!group) notFound()

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user!.id)
    .single()

  if (!membership) notFound()

  const { data: resources } = await supabase
    .from("resources")
    .select("*, profiles!resources_added_by_fkey ( full_name )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  const { data: messages } = await supabase
    .from("messages")
    .select("*, profiles ( full_name )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(100)

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("group_id", groupId)
    .order("priority", { ascending: true })

  const { data: memberRows } = await supabase
    .rpc("get_group_member_emails", { p_group_id: groupId })

  const project = group.projects as { id: string; name: string; description: string | null; created_by: string }

  return (
    <GroupPortal
      groupId={groupId}
      groupName={group.name}
      projectName={project.name}
      userId={user!.id}
      initialResources={resources || []}
      initialMessages={messages || []}
      initialTodos={todos || []}
      members={(memberRows || []).map((m: { user_id: string; email: string | null; full_name: string | null }) => ({
        userId: m.user_id,
        fullName: m.full_name || "Unknown",
        email: m.email || null,
      }))}
    />
  )
}
