import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/interactions";

const languageNames: Record<string, string> = {
  nl: "Dutch (Nederlands)",
  en: "English",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { topicId, action = "start", language = "nl" } = await req.json();
    if (!topicId) return respond({ error: "topicId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return respond({ error: "Gemini API key not configured" }, 500);

    const { data: topic, error: fe } = await supabase
      .from("research_topics").select("*").eq("id", topicId).maybeSingle();
    if (fe || !topic) return respond({ error: "Topic not found" }, 404);

    if (action === "start") return await doStart(supabase, topic, geminiKey, language);
    if (action === "poll") return await doPoll(supabase, topic, geminiKey);
    return respond({ error: "Invalid action" }, 400);
  } catch (e) {
    return respond({ error: "Internal server error", details: String(e) }, 500);
  }
});

async function doStart(sb: any, topic: any, key: string, language: string) {
  const langName = languageNames[language] || "English";

  const prompt = `Conduct thorough, in-depth research on the following question. Provide a comprehensive analysis with real data, statistics, expert perspectives, current trends, and actionable insights.

Question: ${topic.question}

Context:
- Professional Role: ${topic.career}
- Industry: ${topic.industry}

IMPORTANT: Write the entire research report in ${langName}. All section headings, analysis, conclusions, and citations must be in ${langName}.

Format the output as a detailed research report with clear sections. Include specific data points, statistics, and cite your sources.`;

  const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      input: prompt,
      agent: "deep-research-preview-04-2026",
      background: true,
      agent_config: { type: "deep-research", thinking_summaries: "auto" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    await sb.from("research_topics").update({ status: "Pending" }).eq("id", topic.id);
    return respond({ error: `Gemini API error: ${res.status}`, details: err }, 502);
  }

  const data = await res.json();
  const iid = data.id || data.name;

  await sb.from("research_topics").update({
    status: "In Progress",
    gemini_interaction_id: iid,
  }).eq("id", topic.id);

  return respond({ status: "started", interactionId: iid });
}

async function doPoll(sb: any, topic: any, key: string) {
  const iid = topic.gemini_interaction_id;
  if (!iid) return respond({ error: "No research in progress" }, 400);

  const res = await fetch(`${GEMINI_BASE}/${iid}?key=${key}`, {
    headers: { "Api-Revision": "2026-05-20" },
  });

  if (!res.ok) {
    return respond({ status: "polling", researchStatus: "in_progress" });
  }

  const data = await res.json();

  if (data.status === "completed") {
    const summary = getOutputText(data);
    const sources = getSources(data, summary);

    await sb.from("research_topics").update({
      status: "Complete",
      findings: { summary, sources },
      gemini_interaction_id: null,
    }).eq("id", topic.id);

    const { data: updated } = await sb
      .from("research_topics").select("*").eq("id", topic.id).maybeSingle();

    return respond({ status: "completed", topic: updated });
  }

  if (data.status === "failed") {
    await sb.from("research_topics").update({
      status: "Pending", gemini_interaction_id: null,
    }).eq("id", topic.id);
    return respond({ status: "failed", error: data.error || "Research failed" });
  }

  let thought: string | null = null;
  if (Array.isArray(data.steps)) {
    for (const s of data.steps) {
      if (s.type === "thought" && Array.isArray(s.summary)) {
        for (const c of s.summary) {
          if (c.type === "text" && c.text) thought = c.text;
        }
      }
    }
  }

  return respond({ status: "polling", researchStatus: data.status || "in_progress", thinkingSummary: thought });
}

function getOutputText(data: any): string {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  if (typeof data.outputText === "string" && data.outputText) return data.outputText;

  const parts: string[] = [];
  if (Array.isArray(data.steps)) {
    for (const s of data.steps) {
      if (s.type === "model_output" && Array.isArray(s.content)) {
        for (const c of s.content) {
          if (c.type === "text" && typeof c.text === "string") parts.push(c.text);
        }
      }
    }
  }
  return parts.join("\n\n");
}

function getSources(data: any, text: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();

  if (Array.isArray(data.steps)) {
    for (const s of data.steps) {
      if (s.type === "model_output" && Array.isArray(s.content)) {
        for (const c of s.content) {
          if (c.type === "text" && Array.isArray(c.annotations)) {
            for (const a of c.annotations) {
              if (a.type === "url_citation" && a.url && !seen.has(a.url)) {
                seen.add(a.url);
                out.push({ title: a.title || new URL(a.url).hostname, url: a.url });
              }
            }
          }
        }
      }
      const gm = s.groundingMetadata || s.grounding_metadata;
      if (gm && typeof gm === "object") {
        const chunks = gm.groundingChunks || gm.grounding_chunks;
        if (Array.isArray(chunks)) {
          for (const ch of chunks) {
            if (ch.web?.uri && !seen.has(ch.web.uri)) {
              seen.add(ch.web.uri);
              out.push({ title: ch.web.title || new URL(ch.web.uri).hostname, url: ch.web.uri });
            }
          }
        }
      }
    }
  }

  if (out.length === 0 && text) {
    const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!seen.has(m[2])) { seen.add(m[2]); out.push({ title: m[1], url: m[2] }); }
    }
  }
  return out;
}
