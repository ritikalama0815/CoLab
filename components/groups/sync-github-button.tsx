"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Check, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface SyncGitHubButtonProps {
  groupId: string
  hasRepo: boolean
}

export function SyncGitHubButton({ groupId, hasRepo }: SyncGitHubButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleSync = async () => {
    if (!hasRepo) return
    
    setIsSyncing(true)
    setStatus("idle")
    setMessage("")

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync")
      }

      setStatus("success")
      setMessage(`Synced ${data.syncedCount} new commits`)
      router.refresh()

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus("idle")
        setMessage("")
      }, 3000)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to sync")
    } finally {
      setIsSyncing(false)
    }
  }

  if (!hasRepo) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Syncing..." : "Sync GitHub"}
      </Button>
      {status === "success" && (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <Check className="h-4 w-4" />
          {message}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {message}
        </span>
      )}
    </div>
  )
}
