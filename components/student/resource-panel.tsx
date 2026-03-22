"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus, Link2, FileUp, X, Globe, FileText, FolderGit2,
  ExternalLink, Trash2, Copy, Check, Users
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Resource {
  id: string
  title: string
  url: string
  resource_type: string
  created_at: string
  profiles: { full_name: string | null } | null
}

interface ResourcePanelProps {
  groupId: string
  groupName: string
  projectName: string
  userId: string
  initialResources: Resource[]
  memberEmails: string[]
}

const typeIcons: Record<string, typeof Globe> = {
  link: Globe,
  document: FileText,
  repo: FolderGit2,
  other: Link2,
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  link: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200/60" },
  document: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200/60" },
  repo: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-200/60" },
  other: { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-200/60" },
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ""
  }
}

function getOgImageUrl(url: string): string {
  try {
    const encoded = encodeURIComponent(url)
    return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encoded}&size=128`
  } catch {
    return ""
  }
}

function isGoogleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host.includes("google.com") || host.includes("docs.google.com") || host.includes("drive.google.com") || host.includes("slides.google.com") || host.includes("sheets.google.com")
  } catch {
    return false
  }
}

export function ResourcePanel({
  groupId,
  groupName,
  projectName,
  userId,
  initialResources,
  memberEmails,
}: ResourcePanelProps) {
  const router = useRouter()
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [type, setType] = useState("link")
  const [adding, setAdding] = useState(false)

  const [copiedEmails, setCopiedEmails] = useState(false)
  const [showShareHint, setShowShareHint] = useState<string | null>(null)

  const [showSubmit, setShowSubmit] = useState(false)
  const [subTitle, setSubTitle] = useState("")
  const [subLink, setSubLink] = useState("")
  const [subNotes, setSubNotes] = useState("")
  const [subFile, setSubFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [showDocLog, setShowDocLog] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docUrl, setDocUrl] = useState("")
  const [docKind, setDocKind] = useState("docs")
  const [docMins, setDocMins] = useState("")
  const [docLinesAdd, setDocLinesAdd] = useState("")
  const [docLinesRem, setDocLinesRem] = useState("")
  const [docSaving, setDocSaving] = useState(false)
  const [docErr, setDocErr] = useState<string | null>(null)
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  const addResource = async () => {
    if (!title.trim() || !url.trim()) return
    setAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("resources")
        .insert({ group_id: groupId, added_by: userId, title: title.trim(), url: url.trim(), resource_type: type })
        .select("*, profiles!resources_added_by_fkey ( full_name )")
        .single()
      if (!error && data) {
        setResources((prev) => [data, ...prev])
        if (isGoogleUrl(url.trim())) {
          setShowShareHint(data.id)
        }
        setTitle("")
        setUrl("")
        setShowAdd(false)
      }
    } finally {
      setAdding(false)
    }
  }

  const deleteResource = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("resources").delete().eq("id", id)
    if (!error) setResources((prev) => prev.filter((r) => r.id !== id))
  }

  const submitWork = async () => {
    if (!subTitle.trim()) return
    setSubmitting(true)
    setSubmitErr(null)
    try {
      if (subFile) {
        const fd = new FormData()
        fd.append("file", subFile)
        fd.append("groupId", groupId)
        fd.append("title", subTitle.trim())
        if (subNotes.trim()) fd.append("notes", subNotes.trim())
        if (subLink.trim()) fd.append("linkUrl", subLink.trim())
        const res = await fetch("/api/submissions/upload", { method: "POST", body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setSubmitErr(
            typeof data.error === "string"
              ? data.error
              : "Upload failed. Ensure the submission-files bucket exists (see project SQL scripts)."
          )
          return
        }
      } else {
        const supabase = createClient()
        const { error } = await supabase.from("submissions").insert({
          group_id: groupId,
          submitted_by: userId,
          title: subTitle.trim(),
          link_url: subLink.trim() || null,
          notes: subNotes.trim() || null,
        })
        if (error) {
          setSubmitErr(error.message)
          return
        }
      }
      setSubTitle("")
      setSubLink("")
      setSubNotes("")
      setSubFile(null)
      setShowSubmit(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const saveDocLog = async () => {
    if (!docTitle.trim()) return
    setDocSaving(true)
    setDocErr(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("docs_activity").insert({
        group_id: groupId,
        user_id: userId,
        title: docTitle.trim(),
        doc_url: docUrl.trim() || null,
        doc_kind: docKind,
        minutes_spent: Math.max(0, parseInt(docMins, 10) || 0),
        lines_added: Math.max(0, parseInt(docLinesAdd, 10) || 0),
        lines_removed: Math.max(0, parseInt(docLinesRem, 10) || 0),
      })
      if (error) {
        setDocErr(
          error.message.includes("docs_activity")
            ? "Docs logging is not set up yet. Run scripts/add_docs_activity_and_storage.sql in Supabase."
            : error.message
        )
        return
      }
      setDocTitle("")
      setDocUrl("")
      setDocMins("")
      setDocLinesAdd("")
      setDocLinesRem("")
      setShowDocLog(false)
      router.refresh()
    } finally {
      setDocSaving(false)
    }
  }

  const copyMemberEmails = async (resourceUrl?: string) => {
    const emails = memberEmails.join(", ")
    await navigator.clipboard.writeText(emails)
    setCopiedEmails(true)
    if (resourceUrl) {
      setTimeout(() => window.open(resourceUrl, "_blank"), 400)
    }
    setTimeout(() => setCopiedEmails(false), 3000)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{groupName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{projectName}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              setShowSubmit(!showSubmit)
              setShowAdd(false)
              setShowDocLog(false)
            }}
          >
            <FileUp className="h-3 w-3" /> Submit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              setShowDocLog(!showDocLog)
              setShowAdd(false)
              setShowSubmit(false)
            }}
          >
            <FileText className="h-3 w-3" /> Log Docs
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              setShowAdd(!showAdd)
              setShowSubmit(false)
              setShowDocLog(false)
            }}
          >
            <Plus className="h-3 w-3" /> Add Link
          </Button>
        </div>
      </div>

      {/* Add resource form */}
      {showAdd && (
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input className="h-9" placeholder="Resource name" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">URL</Label>
                <Input className="h-9" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="link">Link</option>
                <option value="document">Document</option>
                <option value="repo">Repository</option>
                <option value="other">Other</option>
              </select>
              <Button size="sm" className="h-8 text-xs" onClick={addResource} disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAdd(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit work form */}
      {showSubmit && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submit work</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Upload a file (ZIP, PDF, slides export, etc.) or submit a link only.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {submitErr && (
              <p className="text-xs text-destructive">{submitErr}</p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title</Label>
              <Input className="h-9" placeholder="Submission title" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">File (optional if you use link only)</Label>
              <Input
                className="h-9 cursor-pointer text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                type="file"
                onChange={(e) => setSubFile(e.target.files?.[0] ?? null)}
              />
              {subFile && (
                <p className="text-[11px] text-muted-foreground">
                  Selected: {subFile.name} ({(subFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Link (optional)</Label>
              <Input className="h-9" placeholder="https://..." value={subLink} onChange={(e) => setSubLink(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Input className="h-9" placeholder="Any notes..." value={subNotes} onChange={(e) => setSubNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={submitWork}
                disabled={submitting || !subTitle.trim()}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowSubmit(false); setSubFile(null); setSubmitErr(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self-reported Google Docs / Slides work (feeds instructor reports) */}
      {showDocLog && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Log Google Docs / Slides work</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Enter time and line edits you contributed so the instructor report can reflect writing and slides work, not just GitHub.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {docErr && (
              <p className="text-xs text-destructive">{docErr}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input className="h-9" placeholder="e.g. Final report" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Doc URL (optional)</Label>
                <Input className="h-9" placeholder="https://docs.google.com/..." value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={docKind}
                onChange={(e) => setDocKind(e.target.value)}
              >
                <option value="docs">Google Doc</option>
                <option value="slides">Google Slides</option>
                <option value="sheets">Google Sheets</option>
                <option value="other">Other</option>
              </select>
              <Input
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
                placeholder="Min"
                value={docMins}
                onChange={(e) => setDocMins(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">minutes</span>
              <Input
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
                placeholder="+Lines"
                value={docLinesAdd}
                onChange={(e) => setDocLinesAdd(e.target.value)}
              />
              <Input
                className="h-8 w-24 text-xs"
                type="number"
                min={0}
                placeholder="−Lines"
                value={docLinesRem}
                onChange={(e) => setDocLinesRem(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={saveDocLog} disabled={docSaving || !docTitle.trim()}>
                {docSaving ? "Saving..." : "Save log"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowDocLog(false); setDocErr(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share hint banner — appears after adding a Google resource */}
      {showShareHint && (() => {
        const hintResource = resources.find((r) => r.id === showShareHint)
        return (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/50 px-4 py-3 text-sm">
            <Users className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="flex-1 text-blue-900/80">
              <span className="font-medium">Share with your group!</span>{" "}
              Emails will be copied, then the doc opens so you can paste them in the share dialog.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-100 shrink-0"
              onClick={() => {
                copyMemberEmails(hintResource?.url)
                setShowShareHint(null)
              }}
            >
              {copiedEmails ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedEmails ? "Copied & Opening..." : `Copy emails & open`}
            </Button>
            <button
              onClick={() => setShowShareHint(null)}
              className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })()}

      {/* Resource thumbnail grid */}
      {resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Link2 className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">No resources yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Share links to docs, repos, and workpages with your group
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {resources.map((r) => {
            const Icon = typeIcons[r.resource_type] || Link2
            const colors = typeColors[r.resource_type] || typeColors.other
            const domain = getDomain(r.url)
            const favicon = getFaviconUrl(r.url)

            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col rounded-xl border ${colors.border} bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                {/* Thumbnail area */}
                <div className={`${colors.bg} flex items-center justify-center h-24 relative`}>
                  <Icon className={`h-8 w-8 ${colors.text} opacity-30`} />
                  {favicon && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image
                        src={favicon}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-md"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3.5 w-3.5 text-foreground/50" />
                  </div>
                  {/* Hover actions */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteResource(r.id) }}
                      className="rounded-md p-1 bg-card/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {isGoogleUrl(r.url) && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyMemberEmails(r.url) }}
                        className="rounded-md px-1.5 py-1 bg-card/90 text-[10px] font-medium text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        title="Copy group emails & open sharing"
                      >
                        {copiedEmails ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Share
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium truncate leading-tight">{r.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {favicon && (
                      <Image src={favicon} alt="" width={12} height={12} className="rounded-sm" unoptimized />
                    )}
                    <span className="truncate">{domain}</span>
                  </div>
                  {r.profiles?.full_name && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      by {r.profiles.full_name}
                    </p>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
