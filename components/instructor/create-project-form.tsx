"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, X, UserPlus, FolderPlus, Pencil, Check,
  FileSpreadsheet, Shuffle, Undo2
} from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { getGroupColor } from "@/lib/group-colors"

interface StudentEntry {
  email: string
  profileId: string | null
  fullName: string | null
  groupIndex: number
}

interface GroupDef {
  name: string
  editing: boolean
}

export function CreateProjectForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [groups, setGroups] = useState<GroupDef[]>([
    { name: "Group A", editing: false },
    { name: "Group B", editing: false },
  ])
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [xlsLoading, setXlsLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Spreadsheet preview state
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([])
  const [sheetRows, setSheetRows] = useState<Record<string, unknown>[]>([])
  const [sheetFileName, setSheetFileName] = useState<string | null>(null)
  const [emailColKey, setEmailColKey] = useState<string>("")
  const [nameColKey, setNameColKey] = useState<string>("")

  const guessColumn = (headers: string[], hints: string[]): string => {
    const match = headers.find((h) => hints.includes(h.toLowerCase().trim()))
    return match ?? ""
  }

  const parseFile = async (file: File) => {
    setXlsLoading(true)
    setError(null)
    setSheetFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

      if (rows.length === 0) {
        setError("Spreadsheet is empty")
        setSheetHeaders([])
        setSheetRows([])
        return
      }

      const headers = Object.keys(rows[0])
      setSheetHeaders(headers)
      setSheetRows(rows)

      setEmailColKey(guessColumn(headers, ["email", "e-mail", "email address", "student email", "emailaddress", "mail"]))
      setNameColKey(guessColumn(headers, ["name", "full name", "student name", "fullname", "student"]))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse spreadsheet")
    } finally {
      setXlsLoading(false)
    }
  }

  const confirmImport = async () => {
    if (!emailColKey) {
      setError("Please select which column contains the email addresses")
      return
    }

    setImporting(true)
    setError(null)
    setImportProgress({ current: 0, total: sheetRows.length })

    try {
      const supabase = createClient()
      const newStudents: StudentEntry[] = []
      const existingEmails = new Set(students.map((s) => s.email))
      let skipped = 0

      for (let idx = 0; idx < sheetRows.length; idx++) {
        const row = sheetRows[idx]
        setImportProgress({ current: idx + 1, total: sheetRows.length })

        const rawEmail = String(row[emailColKey] || "").trim().toLowerCase()
        if (!rawEmail || !rawEmail.includes("@")) { skipped++; continue }
        if (existingEmails.has(rawEmail)) { skipped++; continue }

        const { data } = await supabase.rpc("profile_id_for_invite_email", { lookup: rawEmail })
        const match = data?.[0]
        if (match && match.out_role === "instructor") { skipped++; continue }

        const fullName = nameColKey ? String(row[nameColKey] || "").trim() : null

        newStudents.push({
          email: rawEmail,
          profileId: match?.out_id || null,
          fullName: fullName || null,
          groupIndex: 0,
        })
        existingEmails.add(rawEmail)
      }

      if (newStudents.length > 0) {
        setStudents((prev) => [...prev, ...newStudents])
      }

      if (newStudents.length === 0) {
        setError(`No new students found. ${skipped} rows skipped (duplicates, invalid emails, or instructor accounts).`)
      } else if (skipped > 0) {
        setError(`Added ${newStudents.length} student${newStudents.length > 1 ? "s" : ""}. ${skipped} row${skipped > 1 ? "s" : ""} skipped (duplicates, invalid, or instructors).`)
      }

      setSheetHeaders([])
      setSheetRows([])
      setSheetFileName(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import students")
    } finally {
      setImporting(false)
      setImportProgress({ current: 0, total: 0 })
    }
  }

  const cancelPreview = () => {
    setSheetHeaders([])
    setSheetRows([])
    setSheetFileName(null)
    setEmailColKey("")
    setNameColKey("")
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  const addStudent = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    if (students.some((s) => s.email === email)) {
      setError("Student already added")
      return
    }

    setLookupLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data } = await supabase.rpc("profile_id_for_invite_email", { lookup: email })
      const row = data?.[0]

      if (row && row.out_role === "instructor") {
        setError("That email belongs to an instructor account")
        return
      }

      setStudents((prev) => [
        ...prev,
        {
          email,
          profileId: row?.out_id || null,
          fullName: null,
          groupIndex: 0,
        },
      ])
      setEmailInput("")
    } catch {
      setError("Failed to look up email")
    } finally {
      setLookupLoading(false)
    }
  }

  const removeStudent = (email: string) => {
    setStudents((prev) => prev.filter((s) => s.email !== email))
  }

  const setStudentGroup = (email: string, groupIndex: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.email === email ? { ...s, groupIndex } : s))
    )
  }

  const [prevAssignment, setPrevAssignment] = useState<number[] | null>(null)

  const randomAssign = () => {
    if (students.length === 0 || groups.length === 0) return
    setPrevAssignment(students.map((s) => s.groupIndex))
    const shuffled = [...students]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setStudents(
      shuffled.map((s, i) => ({ ...s, groupIndex: i % groups.length }))
    )
  }

  const undoAssign = () => {
    if (!prevAssignment) return
    setStudents((prev) =>
      prev.map((s, i) => ({ ...s, groupIndex: prevAssignment[i] ?? s.groupIndex }))
    )
    setPrevAssignment(null)
  }

  const addGroup = () => {
    const letter = String.fromCharCode(65 + groups.length)
    setGroups((prev) => [...prev, { name: `Group ${letter}`, editing: false }])
  }

  const renameGroup = (index: number, newName: string) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, name: newName } : g))
    )
  }

  const toggleEditGroup = (index: number) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, editing: !g.editing } : g))
    )
  }

  const removeGroup = (index: number) => {
    if (groups.length <= 1) return
    setGroups((prev) => prev.filter((_, i) => i !== index))
    setStudents((prev) =>
      prev.map((s) => {
        if (s.groupIndex === index) return { ...s, groupIndex: 0 }
        if (s.groupIndex > index) return { ...s, groupIndex: s.groupIndex - 1 }
        return s
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Project name is required"); return }
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Create project
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
        .select()
        .single()
      if (pErr) throw new Error(`Project insert failed: ${pErr.message} (${pErr.code}: ${pErr.details})`)

      // 2. Create sub-groups
      const groupInserts = groups.map((g, i) => ({
        project_id: project.id,
        name: g.name,
        sort_order: i,
      }))
      const { data: createdGroups, error: gErr } = await supabase
        .from("project_groups")
        .insert(groupInserts)
        .select()
      if (gErr) throw new Error(`Groups insert failed: ${gErr.message} (${gErr.code}: ${gErr.details})`)

      // 3. Add instructor as admin membership
      const { error: mErr } = await supabase.from("memberships").insert({
        user_id: user.id,
        project_id: project.id,
        group_id: null,
        role: "admin",
      })
      if (mErr) throw new Error(`Membership insert failed: ${mErr.message} (${mErr.code}: ${mErr.details})`)

      // 4. Add student memberships
      for (const student of students) {
        if (!student.profileId) continue
        const targetGroup = createdGroups?.[student.groupIndex]
        await supabase.from("memberships").insert({
          user_id: student.profileId,
          project_id: project.id,
          group_id: targetGroup?.id || null,
          role: "member",
        })
      }

      router.push(`/dashboard/instructor/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/instructor">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Set up a project, add students, and assign them to groups</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g., CS 101 Final Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                placeholder="Describe the project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Define sub-groups for this project</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addGroup}>
              <FolderPlus className="h-3.5 w-3.5" /> Add Group
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {groups.map((g, i) => {
                const color = getGroupColor(i)
                return (
                  <div key={i} className={`flex items-center gap-1.5 rounded-lg border ${color.border} ${color.bgSubtle} px-3 py-1.5`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${color.bg} shrink-0`} />
                    {g.editing ? (
                      <Input
                        className="h-6 w-28 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                        value={g.name}
                        onChange={(e) => renameGroup(i, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && toggleEditGroup(i)}
                        autoFocus
                      />
                    ) : (
                      <span className={`text-sm font-medium ${color.text}`}>{g.name}</span>
                    )}
                    <button type="button" onClick={() => toggleEditGroup(i)} className="text-muted-foreground hover:text-foreground">
                      {g.editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                    </button>
                    {groups.length > 1 && (
                      <button type="button" onClick={() => removeGroup(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Students */}
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>Add students individually or upload a class list spreadsheet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload zone / Preview */}
            {sheetRows.length === 0 ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop an Excel/CSV file, or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-medium text-primary hover:underline"
                    disabled={xlsLoading}
                  >
                    browse
                  </button>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv files
                </p>
                {xlsLoading && (
                  <p className="mt-2 text-sm font-medium text-primary animate-pulse">Reading file...</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                {/* Preview header */}
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{sheetFileName}</span>
                    <Badge variant="secondary" className="text-[10px]">{sheetRows.length} rows</Badge>
                  </div>
                  <button type="button" onClick={cancelPreview} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Column mapping */}
                <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Email column <span className="text-destructive">*</span></Label>
                    <select
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                      value={emailColKey}
                      onChange={(e) => setEmailColKey(e.target.value)}
                    >
                      <option value="">-- Select column --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Name column <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <select
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                      value={nameColKey}
                      onChange={(e) => setNameColKey(e.target.value)}
                    >
                      <option value="">-- None --</option>
                      {sheetHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Data preview table */}
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60">
                      <tr>
                        {sheetHeaders.map((h) => (
                          <th
                            key={h}
                            className={`whitespace-nowrap px-3 py-1.5 text-left font-medium ${
                              h === emailColKey
                                ? "text-primary bg-primary/5"
                                : h === nameColKey
                                ? "text-primary bg-primary/5"
                                : "text-muted-foreground"
                            }`}
                          >
                            {h}
                            {h === emailColKey && <span className="ml-1 text-[9px] opacity-70">(email)</span>}
                            {h === nameColKey && <span className="ml-1 text-[9px] opacity-70">(name)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetRows.slice(0, 50).map((row, ri) => (
                        <tr key={ri} className="border-t border-border/30 hover:bg-muted/30">
                          {sheetHeaders.map((h) => (
                            <td
                              key={h}
                              className={`whitespace-nowrap px-3 py-1 ${
                                h === emailColKey || h === nameColKey ? "bg-primary/5 font-medium" : ""
                              }`}
                            >
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sheetRows.length > 50 && (
                    <p className="px-3 py-1.5 text-[10px] text-muted-foreground text-center">
                      Showing first 50 of {sheetRows.length} rows
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                {importing && importProgress.total > 0 && (
                  <div className="border-t border-border px-4 py-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Looking up students...</span>
                      <span>{importProgress.current} / {importProgress.total}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-200"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Import button */}
                <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelPreview} disabled={importing}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    onClick={confirmImport}
                    disabled={!emailColKey || importing}
                    className="gap-1"
                  >
                    {importing
                      ? `Importing ${importProgress.current}/${importProgress.total}...`
                      : `Import ${sheetRows.length} students`}
                  </Button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or add individually</span>
              </div>
            </div>

            {/* Manual email input */}
            <div className="flex gap-2">
              <Input
                placeholder="student@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStudent())}
              />
              <Button type="button" variant="outline" onClick={addStudent} disabled={lookupLoading} className="gap-1 shrink-0">
                <UserPlus className="h-4 w-4" />
                {lookupLoading ? "..." : "Add"}
              </Button>
            </div>

            {students.length > 0 && (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 flex-1 text-xs font-medium text-muted-foreground">
                    <span>Email</span>
                    <span>Group</span>
                    <span></span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {prevAssignment && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={undoAssign}
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Undo2 className="h-3 w-3" /> Undo
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={randomAssign}
                      disabled={importing}
                      className="h-7 gap-1 text-xs"
                    >
                      <Shuffle className="h-3 w-3" /> Randomize
                    </Button>
                  </div>
                </div>
                {students.map((s) => {
                  const sColor = getGroupColor(s.groupIndex)
                  return (
                    <div key={s.email} className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border/50 px-4 py-2 last:border-0 border-l-2 ${sColor.border}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <span className="truncate text-sm block">{s.email}</span>
                          {s.fullName && (
                            <span className="truncate text-xs text-muted-foreground block">{s.fullName}</span>
                          )}
                        </div>
                        {!s.profileId && (
                          <Badge variant="outline" className="shrink-0 text-[10px] text-warning border-warning/30">
                            Not registered
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sColor.bg} shrink-0`} />
                        <select
                          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          value={s.groupIndex}
                          onChange={(e) => setStudentGroup(s.email, Number(e.target.value))}
                        >
                          {groups.map((g, i) => (
                            <option key={i} value={i}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" onClick={() => removeStudent(s.email)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-4">
          <Button type="submit" variant="gradient" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>
          <Link href="/dashboard/instructor">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
