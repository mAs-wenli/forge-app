import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request) {
  // Verify auth
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, maxTokens, images } = await request.json();

  // Build content: optional images (for 顔相/手相) + text
  const content = [];
  if (Array.isArray(images)) {
    for (const img of images) {
      if (img && img.data) {
        content.push({ type: "image", source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.data } });
      }
    }
  }
  content.push({ type: "text", text: prompt });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 1500,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await res.json();
    const text = (data.content || []).map((c) => c.text || "").filter(Boolean).join("\n");
    return NextResponse.json({ text });
  } catch (e) {
    console.error("Oracle API error:", e);
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}
