"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ProjectSettingsPage() {
  const router = useRouter()
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single()
      if (data) {
        setName(data.name)
        setDescription(data.description || "")
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("projects")
        .update({ name, description: description || null, updated_at: new Date().toISOString() })
        .eq("id", projectId)
      if (error) throw error
      setMessage({ type: "success", text: "Saved" })
      router.refresh()
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this project and all its groups, memberships, and data? This cannot be undone.")) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("projects").delete().eq("id", projectId)
      if (error) throw error
      router.push("/dashboard/instructor")
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" })
      setDeleting(false)
    }
  }

  if (loading) return <p className="py-12 text-center text-muted-foreground">Loading...</p>

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/instructor/projects/${projectId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {message.text}
              </p>
            )}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete this project and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
