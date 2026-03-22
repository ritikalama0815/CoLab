import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pin, Users, Mail, Clock } from "lucide-react"

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function TeammatesPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: group } = await supabase
    .from("project_groups")
    .select("name")
    .eq("id", groupId)
    .single()
  if (!group) notFound()

  const { data: memberRows } = await supabase
    .rpc("get_group_member_emails", { p_group_id: groupId })

  const members = (memberRows || []) as Array<{
    user_id: string
    email: string | null
    full_name: string | null
  }>

  const { data: allMessages } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, profiles ( full_name )")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(500)

  const pinnedMessages = (allMessages || []).filter((m) =>
    m.content.includes("@pin")
  )

  const initials = (name: string | null) => {
    if (!name) return "?"
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
  }

  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      {/* Members */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Team Members
          </h2>
          <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((m, i) => {
            const isMe = m.user_id === user!.id
            return (
              <Card
                key={m.user_id}
                className={`border-border/50 transition-all ${isMe ? "ring-1 ring-primary/20" : ""}`}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-semibold ${colors[i % colors.length]}`}>
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {m.full_name || "Unknown"}
                      </p>
                      {isMe && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">You</Badge>
                      )}
                    </div>
                    {m.email && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-muted-foreground/50" />
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Pinned Messages */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pinned Messages
          </h2>
          <Badge variant="secondary" className="text-[10px]">{pinnedMessages.length}</Badge>
        </div>

        {pinnedMessages.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <Pin className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">No pinned messages yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Type <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">@pin</code> in a chat message to pin it here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pinnedMessages.map((msg) => {
              const senderName = (msg.profiles as { full_name: string | null } | null)?.full_name || "Unknown"
              const displayContent = msg.content.replace(/@pin/gi, "").trim()
              const isMe = msg.user_id === user!.id

              return (
                <Card key={msg.id} className="border-border/50 border-l-4 border-l-primary/40">
                  <CardContent className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Pin className="h-3 w-3 text-primary/60" />
                        <span className="text-xs font-medium">
                          {senderName}
                          {isMe && <span className="text-muted-foreground ml-1">(you)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.created_at).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {displayContent || <span className="text-muted-foreground italic">Pinned</span>}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
