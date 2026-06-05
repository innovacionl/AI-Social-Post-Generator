import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return respond({ error: "OpenRouter API key not configured" }, 500);

    const { data: topic, error: fe } = await supabase
      .from("research_topics").select("*").eq("id", topicId).maybeSingle();
    if (fe || !topic) return respond({ error: "Topic not found" }, 404);

    if (action === "start") {
      // Mark in-progress immediately so frontend can start polling
      await supabase.from("research_topics")
        .update({ status: "In Progress", gemini_interaction_id: null })
        .eq("id", topicId);

      // Run the OpenRouter call in the background so this response returns fast
      EdgeRuntime.waitUntil(runResearch(supabase, topic, apiKey, language));

      return respond({ status: "started" });
    }

    if (action === "poll") {
      // Re-fetch latest DB state — no external API call needed
      const { data: latest } = await supabase
        .from("research_topics").select("*").eq("id", topicId).maybeSingle();

      if (!latest) return respond({ status: "failed", error: "Topic not found" });

      if (latest.status === "Complete") {
        return respond({ status: "completed", topic: latest });
      }
      if (latest.status === "Pending") {
        // Was reset or research failed
        return respond({ status: "failed", error: "Research did not complete" });
      }
      // Still "In Progress"
      return respond({ status: "polling", researchStatus: "in_progress" });
    }

    if (action === "status") {
      // Diagnostic: return full DB record
      return respond({ topic });
    }

    return respond({ error: "Invalid action" }, 400);
  } catch (e) {
    return respond({ error: "Internal server error", details: String(e) }, 500);
  }
});

// Runs in the background via waitUntil — updates DB when done
async function runResearch(sb: any, topic: any, apiKey: string, language: string) {
  const langName = languageNames[language] || "English";

  const systemPrompt = `You are an expert research analyst. Write a thorough, well-structured research report based on your knowledge up to your training cutoff.

IMPORTANT: Write the entire report in ${langName}. All headings, analysis, conclusions, and any references must be in ${langName}.

Structure the report with clear sections:
1. Executive Summary
2. Key Findings (with data points and statistics where possible)
3. Current Trends & Developments
4. Expert Perspectives
5. Implications & Actionable Insights
6. Conclusion

Be specific, cite figures and examples, and write at a depth suitable for a thought leader creating social media content.`;

  const userPrompt = `Conduct thorough research on the following question:

"${topic.question}"

Context:
- Professional Role: ${topic.career}
- Industry: ${topic.industry}

Write a comprehensive research report (aim for 1500–2500 words) that gives this professional genuine insights they can use to create compelling social media thought-leadership content. Include specific data, trends, statistics, and expert perspectives.

Respond entirely in ${langName}.`;

  try {
    // Model: google/gemini-2.0-flash-001 — confirmed valid, $0.10/$0.40 per M tokens; good quality for long-form research
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenRouter error:", res.status, err);
      await sb.from("research_topics")
        .update({ status: "Pending", gemini_interaction_id: null })
        .eq("id", topic.id);
      return;
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";

    if (!summary) {
      await sb.from("research_topics")
        .update({ status: "Pending", gemini_interaction_id: null })
        .eq("id", topic.id);
      return;
    }

    await sb.from("research_topics").update({
      status: "Complete",
      findings: { summary, sources: [] },
      gemini_interaction_id: null,
    }).eq("id", topic.id);
  } catch (err) {
    console.error("Research background task failed:", err);
    await sb.from("research_topics")
      .update({ status: "Pending", gemini_interaction_id: null })
      .eq("id", topic.id);
  }
}
