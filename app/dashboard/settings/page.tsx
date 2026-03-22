"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  full_name: string | null
  github_username: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [githubUsername, setGithubUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || "")
        setGithubUsername(profileData.github_username || "")
      }
      setIsLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          github_username: githubUsername || null,
        })
        .eq("id", user.id)

      if (error) throw error

      // Also update user metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      })

      setMessage({ type: "success", text: "Profile updated successfully" })
      router.refresh()
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to save" 
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUsername">GitHub Username</Label>
              <Input
                id="githubUsername"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="johndoe"
              />
              <p className="text-xs text-muted-foreground">
                Your GitHub username is used to link commits to your profile
              </p>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">User ID</p>
            <p className="font-mono text-sm text-foreground">{profile?.id}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this ID with group owners to join their groups
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
