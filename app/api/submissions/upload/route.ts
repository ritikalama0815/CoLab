import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const groupId = formData.get("groupId") as string | null
    const title = (formData.get("title") as string | null)?.trim()
    const notes = (formData.get("notes") as string | null)?.trim() || null
    const linkUrl = (formData.get("linkUrl") as string | null)?.trim() || null

    if (!groupId || !title) {
      return NextResponse.json(
        { error: "groupId and title are required" },
        { status: 400 }
      )
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 })
    }

    const { data: group, error: gErr } = await supabase
      .from("project_groups")
      .select("id")
      .eq("id", groupId)
      .single()

    if (gErr || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const { data: mem } = await supabase
      .from("memberships")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!mem) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180)
    const path = `${user.id}/${groupId}/${Date.now()}_${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage
      .from("submission-files")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
      })

    if (upErr) {
      console.error("Storage upload:", upErr)
      return NextResponse.json(
        {
          error:
            upErr.message ||
            "Upload failed. Create bucket submission-files (see scripts/add_docs_activity_and_storage.sql).",
        },
        { status: 500 }
      )
    }

    const { data: pub } = supabase.storage
      .from("submission-files")
      .getPublicUrl(path)

    const { error: insErr } = await supabase.from("submissions").insert({
      group_id: groupId,
      submitted_by: user.id,
      title,
      file_url: pub.publicUrl,
      link_url: linkUrl,
      notes,
    })

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, fileUrl: pub.publicUrl })
  } catch (error) {
    console.error("Submission upload:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload submission",
      },
      { status: 500 }
    )
  }
}
