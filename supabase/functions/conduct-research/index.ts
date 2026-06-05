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

const DEFAULT_MODEL = "openai/gpt-4o-mini";

const DEFAULT_SYSTEM = `You are an expert research analyst. Write a thorough, well-structured research report based on your knowledge up to your training cutoff.

IMPORTANT: Write the entire report in {{languageName}}. All headings, analysis, conclusions, and any references must be in {{languageName}}.

Structure the report with clear sections:
1. Executive Summary
2. Key Findings (with data points and statistics where possible)
3. Current Trends & Developments
4. Expert Perspectives
5. Implications & Actionable Insights
6. Conclusion

Be specific, cite figures and examples, and write at a depth suitable for a thought leader creating social media content.`;

const DEFAULT_USER = `Conduct thorough research on the following question:

"{{question}}"

Context:
- Professional Role: {{career}}
- Industry: {{industry}}

Write a comprehensive research report (aim for 1500–2500 words) that gives this professional genuine insights they can use to create compelling social media thought-leadership content. Include specific data, trends, statistics, and expert perspectives.

Respond entirely in {{languageName}}.`;

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}

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
      await supabase.from("research_topics")
        .update({ status: "In Progress" })
        .eq("id", topicId);

      // Load custom prompts
      const { data: promptRows } = await supabase
        .from("prompt_settings")
        .select("key, value")
        .in("key", ["research_system", "research_user", "research_model"]);
      const custom: Record<string, string> = {};
      (promptRows ?? []).forEach(({ key, value }: { key: string; value: string }) => {
        custom[key] = value;
      });

      const { summary, error: researchError } = await runResearch(
        topic, apiKey, language,
        custom.research_system ?? DEFAULT_SYSTEM,
        custom.research_user ?? DEFAULT_USER,
        custom.research_model ?? DEFAULT_MODEL,
      );

      if (researchError || !summary) {
        await supabase.from("research_topics")
          .update({ status: "Pending" })
          .eq("id", topicId);
        return respond({ status: "failed", error: researchError || "Empty response from model" });
      }

      await supabase.from("research_topics").update({
        status: "Complete",
        findings: { summary, sources: [] },
      }).eq("id", topicId);

      const { data: updated } = await supabase
        .from("research_topics").select("*").eq("id", topicId).maybeSingle();

      return respond({ status: "completed", topic: updated });
    }

    if (action === "poll") {
      const { data: latest } = await supabase
        .from("research_topics").select("*").eq("id", topicId).maybeSingle();

      if (!latest) return respond({ status: "failed", error: "Topic not found" });

      if (latest.status === "Complete") {
        return respond({ status: "completed", topic: latest });
      }
      if (latest.status === "Pending") {
        return respond({ status: "failed", error: "Research did not complete" });
      }
      return respond({ status: "polling", researchStatus: "in_progress" });
    }

    if (action === "status") {
      return respond({ topic });
    }

    return respond({ error: "Invalid action" }, 400);
  } catch (e) {
    return respond({ error: "Internal server error", details: String(e) }, 500);
  }
});

async function runResearch(
  topic: any,
  apiKey: string,
  language: string,
  systemTemplate: string,
  userTemplate: string,
  model: string,
): Promise<{ summary?: string; error?: string }> {
  const langName = languageNames[language] || "English";

  const systemPrompt = fill(systemTemplate, { languageName: langName });
  const userPrompt = fill(userTemplate, {
    question: topic.question,
    career: topic.career,
    industry: topic.industry,
    languageName: langName,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      return { error: `OpenRouter ${res.status}: ${err}` };
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return { error: "Model returned empty content" };
    return { summary };
  } catch (err: any) {
    return { error: err?.name === "AbortError" ? "Request timed out" : String(err) };
  }
}
