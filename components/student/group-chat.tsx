"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Pin, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AIPlanCard } from "./ai-plan-card"

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null } | null
}

interface GroupChatProps {
  groupId: string
  userId: string
  initialMessages: Message[]
  members: Array<{ userId: string; fullName: string }>
}

const AI_PLAN_PREFIX = "@ai-plan::"

function parseAIPlan(content: string) {
  if (!content.startsWith(AI_PLAN_PREFIX)) return null
  try {
    return JSON.parse(content.slice(AI_PLAN_PREFIX.length))
  } catch {
    return null
  }
}

export function GroupChat({ groupId, userId, initialMessages, members }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [confirmedPlans, setConfirmedPlans] = useState<Set<string>>(new Set())
  const [lastAIPrompt, setLastAIPrompt] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  const memberMap = useRef<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const m of members) map[m.userId] = m.fullName
    memberMap.current = map
  }, [members])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          newMsg.profiles = {
            full_name: memberMap.current[newMsg.user_id] || null,
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  const callAIPlan = useCallback(
    async (prompt: string) => {
      setAiThinking(true)
      setLastAIPrompt(prompt)
      try {
        const res = await fetch("/api/ai/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, userPrompt: prompt }),
        })
        const data = await res.json()
        if (!res.ok) {
          const errorMsg: Message = {
            id: `ai-error-${Date.now()}`,
            content: `AI Error: ${data.error || "Something went wrong"}`,
            created_at: new Date().toISOString(),
            user_id: "system",
            profiles: { full_name: "AI Assistant" },
          }
          setMessages((prev) => [...prev, errorMsg])
        }
      } catch {
        const errorMsg: Message = {
          id: `ai-error-${Date.now()}`,
          content: "AI Error: Network error. Please try again.",
          created_at: new Date().toISOString(),
          user_id: "system",
          profiles: { full_name: "AI Assistant" },
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setAiThinking(false)
      }
    },
    [groupId]
  )

  const confirmPlan = useCallback(
    async (plan: unknown, messageId: string) => {
      const res = await fetch("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, plan }),
      })
      if (res.ok) {
        setConfirmedPlans((prev) => new Set(prev).add(messageId))
      } else {
        const data = await res.json()
        alert(`Failed to confirm plan: ${data.error}`)
      }
    },
    [groupId]
  )

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setInput("")

    const isAI = /^@ai\s/i.test(text)
    const aiPrompt = isAI ? text.replace(/^@ai\s+/i, "").trim() : ""

    try {
      if (isAI) {
        await supabaseRef.current.from("messages").insert({
          group_id: groupId,
          user_id: userId,
          content: text,
        })
        await callAIPlan(aiPrompt)
      } else {
        const { error } = await supabaseRef.current.from("messages").insert({
          group_id: groupId,
          user_id: userId,
          content: text,
        })
        if (error) {
          console.error("[Chat] Send failed:", error.message)
          setInput(text)
        }
      }
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === userId
          const isSystem = msg.user_id === "system"
          const name =
            msg.profiles?.full_name || memberMap.current[msg.user_id] || "Unknown"

          const plan = parseAIPlan(msg.content)
          if (plan) {
            return (
              <div key={msg.id} className="flex flex-col items-start">
                <span className="mb-1 text-[10px] text-muted-foreground">
                  AI Assistant · {formatTime(msg.created_at)}
                </span>
                <AIPlanCard
                  plan={plan}
                  onConfirm={() => confirmPlan(plan, msg.id)}
                  onRegenerate={() => callAIPlan(lastAIPrompt)}
                  confirmed={confirmedPlans.has(msg.id)}
                />
              </div>
            )
          }

          const isAIRequest = /^@ai\s/i.test(msg.content)
          const isPinned = msg.content.includes("@pin")
          const displayContent = isPinned
            ? msg.content.replace(/@pin/gi, "").trim()
            : msg.content

          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col",
                isSystem ? "items-center" : isMe ? "items-end" : "items-start"
              )}
            >
              <span className="mb-0.5 text-[10px] text-muted-foreground">
                {name} · {formatTime(msg.created_at)}
              </span>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  isPinned && "border border-primary/30",
                  isAIRequest &&
                    "border border-violet-300/50 bg-violet-50 dark:bg-violet-950/30",
                  isSystem
                    ? "bg-destructive/10 text-destructive"
                    : isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                )}
              >
                {isPinned && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-medium mb-1",
                      isMe
                        ? "text-primary-foreground/70"
                        : "text-primary/70"
                    )}
                  >
                    <Pin className="h-2.5 w-2.5" />
                    Pinned
                  </div>
                )}
                {isAIRequest && (
                  <div className="flex items-center gap-1 text-[10px] font-medium mb-1 text-violet-600 dark:text-violet-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI Request
                  </div>
                )}
                {displayContent || "📌"}
              </div>
            </div>
          )
        })}

        {/* AI thinking indicator */}
        {aiThinking && (
          <div className="flex flex-col items-start">
            <span className="mb-0.5 text-[10px] text-muted-foreground">
              AI Assistant
            </span>
            <div className="flex items-center gap-2 rounded-xl bg-linear-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Generating project plan...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Type a message... (@AI to plan)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={sending || aiThinking || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
        <p className="text-[9px] text-muted-foreground/50 mt-1 px-1">
          Type <span className="font-mono bg-muted px-0.5 rounded">@AI your request</span> to generate a project plan
        </p>
      </div>
    </div>
  )
}
