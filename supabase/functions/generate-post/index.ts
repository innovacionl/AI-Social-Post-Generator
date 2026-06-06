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

const DEFAULT_SYSTEM = `You are an expert social media content creator. You craft viral, engaging posts from research insights.

The user's chosen tone/style: {{tone}}
{{customStyleSection}}
Platform rules:
{{platformGuide}}

You must generate exactly 5 distinct post variations based on the research provided. Each variation should take a different angle:
1. A strong hook / attention-grabber opening
2. A data-led / statistics-focused approach
3. A storytelling / personal narrative angle
4. A contrarian / challenging conventional wisdom take
5. A call-to-action / community engagement approach

IMPORTANT: Write ALL posts entirely in {{languageName}}. Do not use any other language.

Separate each post with exactly this delimiter on its own line: ---POST_SEPARATOR---

Return ONLY the 5 posts separated by the delimiter. No numbering, no labels, no JSON - just raw post text ready to copy-paste.`;

const DEFAULT_USER = `Create 5 {{platformLabel}} post variations based on this research:

Question: {{question}}
Career: {{career}}
Industry: {{industry}}
{{researchContext}}
Write 5 compelling posts in a "{{tone}}" tone that will resonate with professionals in {{industry}}.

Remember: all posts must be written in {{languageName}}.`;

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
    const { topicId, platform, tone, customStyle, language = "nl" } = await req.json();

    if (!topicId || !platform || !tone) {
      return respond({ error: "topicId, platform, and tone are required" }, 400);
    }

    // User-scoped client — RLS ensures users only access their own data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: topic, error: fetchError } = await supabase
      .from("research_topics")
      .select("*")
      .eq("id", topicId)
      .maybeSingle();

    if (fetchError || !topic) {
      return respond({ error: "Research topic not found" }, 404);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return respond({ error: "OpenRouter API key not configured" }, 500);
    }

    const langName = languageNames[language] || "English";

    const { data: promptRows } = await supabase
      .from("prompt_settings")
      .select("key, value")
      .in("key", ["post_system", "post_user", "post_model"]);
    const custom: Record<string, string> = {};
    (promptRows ?? []).forEach(({ key, value }: { key: string; value: string }) => {
      custom[key] = value;
    });

    const platformGuide =
      platform === "twitter"
        ? "X (Twitter) posts: Maximum 280 characters each. Concise, punchy, attention-grabbing. Use line breaks for readability. Hashtags are optional."
        : "LinkedIn posts: 800-1500 characters each. Short paragraphs and line breaks. Open with a hook. End with a call-to-action or thought-provoking question. Hashtags at the end are encouraged.";
    const platformLabel = platform === "twitter" ? "X (Twitter)" : "LinkedIn";
    const customStyleSection = customStyle
      ? "\n\nAdditional style instructions from the user:\n" + customStyle
      : "";
    const researchContext = topic.findings?.summary
      ? "\nResearch Findings:\n" + topic.findings.summary
      : "\nNo detailed research available - use the question itself as the basis for the posts.";

    const systemPrompt = fill(custom.post_system ?? DEFAULT_SYSTEM, {
      tone,
      customStyleSection,
      platformGuide,
      languageName: langName,
    });

    const userPrompt = fill(custom.post_user ?? DEFAULT_USER, {
      platformLabel,
      question: topic.question,
      career: topic.career,
      industry: topic.industry,
      researchContext,
      tone,
      languageName: langName,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: custom.post_model ?? DEFAULT_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return respond({ error: "OpenRouter API error: " + response.status, details: errorText }, 502);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content || "";

    const posts = fullText
      .split("---POST_SEPARATOR---")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    if (posts.length === 0) {
      return respond({ error: "No posts were generated" }, 500);
    }

    const variations = posts.map((content: string, index: number) => ({
      index,
      platform,
      tone,
      content,
      research_topic_id: topicId,
    }));

    return respond({ variations });
  } catch (error) {
    return respond({ error: "Internal server error", details: String(error) }, 500);
  }
});
