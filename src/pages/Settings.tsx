import { useState, useEffect, useRef } from 'react';
import {
  Lightbulb,
  Search,
  PenTool,
  RotateCcw,
  Save,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

// ─── Default prompt templates ──────────────────────────────────────────────

export const DEFAULTS: Record<string, string> = {
  questions_system: `You are a research strategist who helps professionals identify high-value research questions relevant to their career and industry. Generate questions that are:
- Timely and relevant to current trends (2024-2025)
- Specific enough to research effectively
- Likely to yield insights that can be turned into compelling social media content
- Thought-provoking and non-obvious

IMPORTANT: Write ALL questions in {{languageName}}. Do not use any other language.

Return ONLY a JSON array of exactly 5 strings, each being a research question. No other text or formatting.`,

  questions_user: `Generate 5 research questions for a professional with the following context:
- Career/Role: {{career}}
- Industry: {{industry}}
{{topicContext}}
The questions should help them discover insights they can share as thought leadership content on social media.

Remember: respond entirely in {{languageName}}.`,

  research_system: `You are an expert research analyst. Write a thorough, well-structured research report based on your knowledge up to your training cutoff.

IMPORTANT: Write the entire report in {{languageName}}. All headings, analysis, conclusions, and any references must be in {{languageName}}.

Structure the report with clear sections:
1. Executive Summary
2. Key Findings (with data points and statistics where possible)
3. Current Trends & Developments
4. Expert Perspectives
5. Implications & Actionable Insights
6. Conclusion

Be specific, cite figures and examples, and write at a depth suitable for a thought leader creating social media content.`,

  research_user: `Conduct thorough research on the following question:

"{{question}}"

Context:
- Professional Role: {{career}}
- Industry: {{industry}}

Write a comprehensive research report (aim for 1500–2500 words) that gives this professional genuine insights they can use to create compelling social media thought-leadership content. Include specific data, trends, statistics, and expert perspectives.

Respond entirely in {{languageName}}.`,

  post_system: `You are an expert social media content creator. You craft viral, engaging posts from research insights.

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

Return ONLY the 5 posts separated by the delimiter. No numbering, no labels, no JSON - just raw post text ready to copy-paste.`,

  post_user: `Create 5 {{platformLabel}} post variations based on this research:

Question: {{question}}
Career: {{career}}
Industry: {{industry}}
{{researchContext}}
Write 5 compelling posts in a "{{tone}}" tone that will resonate with professionals in {{industry}}.

Remember: all posts must be written in {{languageName}}.`,
};

// ─── Placeholder definitions per prompt key ────────────────────────────────

interface Placeholder {
  name: string;
  description: string;
}

const PLACEHOLDERS: Record<string, Placeholder[]> = {
  questions_system: [
    { name: '{{languageName}}', description: 'Taalnaam (bijv. Dutch)' },
  ],
  questions_user: [
    { name: '{{career}}', description: 'Carrière / functie' },
    { name: '{{industry}}', description: 'Branche' },
    { name: '{{topicContext}}', description: 'Specifiek onderwerp (optioneel)' },
    { name: '{{languageName}}', description: 'Taalnaam' },
  ],
  research_system: [
    { name: '{{languageName}}', description: 'Taalnaam' },
  ],
  research_user: [
    { name: '{{question}}', description: 'Onderzoeksvraag' },
    { name: '{{career}}', description: 'Carrière / functie' },
    { name: '{{industry}}', description: 'Branche' },
    { name: '{{languageName}}', description: 'Taalaam' },
  ],
  post_system: [
    { name: '{{tone}}', description: 'Geselecteerde toon' },
    { name: '{{customStyleSection}}', description: 'Aangepaste stijlinstructies' },
    { name: '{{platformGuide}}', description: 'Platformregels (Twitter/LinkedIn)' },
    { name: '{{languageName}}', description: 'Taalaam' },
  ],
  post_user: [
    { name: '{{platformLabel}}', description: 'Platform naam' },
    { name: '{{question}}', description: 'Onderzoeksvraag' },
    { name: '{{career}}', description: 'Carrière / functie' },
    { name: '{{industry}}', description: 'Branche' },
    { name: '{{researchContext}}', description: 'Samenvatting onderzoeksresultaten' },
    { name: '{{tone}}', description: 'Geselecteerde toon' },
    { name: '{{languageName}}', description: 'Taalaam' },
  ],
};

// ─── Section config ────────────────────────────────────────────────────────

interface Section {
  id: 'questions' | 'research' | 'posts';
  icon: typeof Lightbulb;
  labelNl: string;
  labelEn: string;
  descriptionNl: string;
  descriptionEn: string;
  systemKey: string;
  userKey: string;
  systemLabelNl: string;
  userLabelNl: string;
  systemLabelEn: string;
  userLabelEn: string;
}

const SECTIONS: Section[] = [
  {
    id: 'questions',
    icon: Lightbulb,
    labelNl: 'Vragen Genereren',
    labelEn: 'Generate Questions',
    descriptionNl: 'Prompts waarmee AI onderzoeksvragen genereert op basis van carrière, branche en onderwerp.',
    descriptionEn: 'Prompts used to generate research questions from career, industry and topic context.',
    systemKey: 'questions_system',
    userKey: 'questions_user',
    systemLabelNl: 'Systeemprompt',
    userLabelNl: 'Gebruikersprompt',
    systemLabelEn: 'System Prompt',
    userLabelEn: 'User Prompt',
  },
  {
    id: 'research',
    icon: Search,
    labelNl: 'Onderzoek Uitvoeren',
    labelEn: 'Conduct Research',
    descriptionNl: 'Prompts waarmee AI een uitgebreid onderzoeksrapport schrijft over een vraag.',
    descriptionEn: 'Prompts used to produce a comprehensive research report for a given question.',
    systemKey: 'research_system',
    userKey: 'research_user',
    systemLabelNl: 'Systeemprompt',
    userLabelNl: 'Gebruikersprompt',
    systemLabelEn: 'System Prompt',
    userLabelEn: 'User Prompt',
  },
  {
    id: 'posts',
    icon: PenTool,
    labelNl: 'Posts Genereren',
    labelEn: 'Generate Posts',
    descriptionNl: 'Prompts waarmee AI 5 sociale mediaposts maakt op basis van onderzoeksresultaten.',
    descriptionEn: 'Prompts used to generate 5 social media post variations from research findings.',
    systemKey: 'post_system',
    userKey: 'post_user',
    systemLabelNl: 'Systeemprompt',
    userLabelNl: 'Gebruikersprompt',
    systemLabelEn: 'System Prompt',
    userLabelEn: 'User Prompt',
  },
];

// ─── PromptEditor component ────────────────────────────────────────────────

interface PromptEditorProps {
  label: string;
  promptKey: string;
  value: string;
  onChange: (val: string) => void;
}

function PromptEditor({ label, promptKey, value, onChange }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholders = PLACEHOLDERS[promptKey] ?? [];

  function insertPlaceholder(ph: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + ph);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ph + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + ph.length;
      ta.selectionEnd = start + ph.length;
    }, 0);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {placeholders.length > 0 && (
          <span className="text-xs text-slate-400">Klik op een variabele om in te voegen</span>
        )}
      </div>

      {placeholders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((ph) => (
            <button
              key={ph.name}
              type="button"
              title={ph.description}
              onClick={() => insertPlaceholder(ph.name)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 hover:border-teal-300 transition-colors"
            >
              {ph.name}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        spellCheck={false}
        className="w-full px-4 py-3 text-sm text-slate-700 font-mono bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all resize-y leading-relaxed"
      />
    </div>
  );
}

// ─── Main Settings page ────────────────────────────────────────────────────

export default function Settings() {
  const { language } = useI18n();
  const [activeTab, setActiveTab] = useState<Section['id']>('questions');
  const [values, setValues] = useState<Record<string, string>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [savedTab, setSavedTab] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    supabase
      .from('prompt_settings')
      .select('key, value')
      .then(({ data }) => {
        if (data) {
          const loaded: Record<string, string> = {};
          data.forEach(({ key, value }) => { loaded[key] = value; });
          setValues((prev) => ({ ...prev, ...loaded }));
        }
        setLoading(false);
      });
  }, []);

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSavedTab(null);
  }

  function handleReset(section: Section) {
    setValues((prev) => ({
      ...prev,
      [section.systemKey]: DEFAULTS[section.systemKey],
      [section.userKey]: DEFAULTS[section.userKey],
    }));
    setSavedTab(null);
  }

  async function handleSave(section: Section) {
    setSavingTab(section.id);
    setSaveError('');
    const rows = [
      { key: section.systemKey, value: values[section.systemKey], updated_at: new Date().toISOString() },
      { key: section.userKey, value: values[section.userKey], updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from('prompt_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      setSaveError(error.message);
    } else {
      setSavedTab(section.id);
      setTimeout(() => setSavedTab(null), 2500);
    }
    setSavingTab(null);
  }

  const section = SECTIONS.find((s) => s.id === activeTab)!;
  const label = (s: Section) => language === 'nl' ? s.labelNl : s.labelEn;
  const desc = (s: Section) => language === 'nl' ? s.descriptionNl : s.descriptionEn;
  const sysLabel = language === 'nl' ? section.systemLabelNl : section.systemLabelEn;
  const usrLabel = language === 'nl' ? section.userLabelNl : section.userLabelEn;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {language === 'nl' ? 'Instellingen' : 'Settings'}
        </h1>
        <p className="text-slate-500 mt-1">
          {language === 'nl'
            ? 'Bewerk de AI-prompts die in elke stap worden gebruikt.'
            : 'Edit the AI prompts used in each step.'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-8 border border-slate-200">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label(s)}</span>
                </button>
              );
            })}
          </div>

          {/* Section description */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <section.icon size={16} className="text-teal-600 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600">{desc(section)}</p>
          </div>

          {/* Prompt editors */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <PromptEditor
                label={sysLabel}
                promptKey={section.systemKey}
                value={values[section.systemKey] ?? DEFAULTS[section.systemKey]}
                onChange={(val) => handleChange(section.systemKey, val)}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <PromptEditor
                label={usrLabel}
                promptKey={section.userKey}
                value={values[section.userKey] ?? DEFAULTS[section.userKey]}
                onChange={(val) => handleChange(section.userKey, val)}
              />
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} />
              {saveError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => handleReset(section)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <RotateCcw size={14} />
              {language === 'nl' ? 'Terugzetten naar standaard' : 'Reset to defaults'}
            </button>

            <button
              onClick={() => handleSave(section)}
              disabled={savingTab === section.id}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-all ${
                savedTab === section.id
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {savingTab === section.id ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {language === 'nl' ? 'Opslaan...' : 'Saving...'}
                </>
              ) : savedTab === section.id ? (
                <>
                  <Check size={14} />
                  {language === 'nl' ? 'Opgeslagen' : 'Saved'}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {language === 'nl' ? 'Wijzigingen opslaan' : 'Save changes'}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
