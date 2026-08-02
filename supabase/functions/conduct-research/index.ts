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

// Only models offered in the app's settings screen may be billed to our API key.
const ALLOWED_MODELS = new Set([
  "meta-llama/llama-3.1-8b-instruct",
  "meta-llama/llama-3.1-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "openai/gpt-4.1-mini",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
  "google/gemini-flash-1.5",
  "google/gemini-pro-1.5",
  "mistralai/mistral-7b-instruct",
  "mistralai/mistral-nemo",
]);

function safeModel(value: unknown, fallback: string): string {
  return typeof value === "string" && ALLOWED_MODELS.has(value) ? value : fallback;
}

const MAX_FIELD = 500;
const MAX_TEMPLATE = 8000;

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

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
    const authHeader = req.headers.get("Authorization") ?? "";
    const body = await req.json();
    const topicId = clamp(body.topicId, 100);
    const action = body.action === "poll" || body.action === "status" ? body.action : "start";
    const language = body.language === "en" ? "en" : "nl";
    if (!topicId) return respond({ error: "topicId is required" }, 400);

    // User-scoped client — RLS ensures users only access their own data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // The anon key is public and satisfies verify_jwt on its own, so require a real user.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return respond({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return respond({ error: "Service is not configured" }, 500);

    const { data: topic, error: fe } = await supabase
      .from("research_topics").select("*").eq("id", topicId).maybeSingle();
    if (fe || !topic) return respond({ error: "Topic not found" }, 404);

    if (action === "start") {
      await supabase.from("research_topics")
        .update({ status: "In Progress" })
        .eq("id", topicId);

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
        clamp(custom.research_system, MAX_TEMPLATE) || DEFAULT_SYSTEM,
        clamp(custom.research_user, MAX_TEMPLATE) || DEFAULT_USER,
        safeModel(custom.research_model, DEFAULT_MODEL),
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
    console.error("conduct-research failed", e);
    return respond({ error: "Internal server error" }, 500);
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
    question: String(topic.question ?? "").slice(0, MAX_FIELD),
    career: String(topic.career ?? "").slice(0, MAX_FIELD),
    industry: String(topic.industry ?? "").slice(0, MAX_FIELD),
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
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error("OpenRouter error", res.status, await res.text());
      return { error: "The research service is temporarily unavailable." };
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return { error: "Model returned empty content" };
    return { summary };
  } catch (err: any) {
    console.error("runResearch failed", err);
    return { error: err?.name === "AbortError" ? "Request timed out" : "Research could not be completed." };
  }
}
