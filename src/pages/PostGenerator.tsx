import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Twitter,
  Linkedin,
  Sparkles,
  FileText,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Link2,
  Save,
  X,
  History,
} from 'lucide-react';
import { supabase, supabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface ResearchTopic {
  id: string;
  question: string;
  career: string;
  industry: string;
  status: string;
  findings: { summary?: string; sources?: { title: string; url: string }[] } | null;
}

interface GeneratedVariation {
  index: number;
  platform: string;
  tone: string;
  content: string;
  research_topic_id: string;
}

const STORAGE_KEY_RESEARCH = 'postgen_research_item';
const STORAGE_KEY_VARIATIONS = 'postgen_variations';
const STORAGE_KEY_SAVED = 'postgen_saved_indexes';
const STORAGE_KEY_PLATFORM = 'postgen_platform';
const STORAGE_KEY_TONE = 'postgen_tone';
const STORAGE_KEY_STYLE = 'postgen_custom_style';

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function PostGenerator() {
  const location = useLocation();
  const { t, language } = useI18n();

  const [researchItem, setResearchItem] = useState<ResearchTopic | null>(() =>
    loadSession(STORAGE_KEY_RESEARCH, null)
  );
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'linkedin'>(() =>
    loadSession(STORAGE_KEY_PLATFORM, 'linkedin')
  );
  const [selectedTone, setSelectedTone] = useState(() =>
    loadSession(STORAGE_KEY_TONE, t.postGenerator.toneOptions[0])
  );
  const [customStyle, setCustomStyle] = useState(() =>
    loadSession(STORAGE_KEY_STYLE, '')
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [researchExpanded, setResearchExpanded] = useState(false);

  const [variations, setVariations] = useState<GeneratedVariation[]>(() =>
    loadSession(STORAGE_KEY_VARIATIONS, [])
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(() => {
    const arr = loadSession<number[]>(STORAGE_KEY_SAVED, []);
    return new Set(arr);
  });
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const state = location.state as { researchTopic?: ResearchTopic } | null;
    if (state?.researchTopic) {
      setResearchItem(state.researchTopic);
      setResearchExpanded(false);
    }
  }, [location.state]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_RESEARCH, JSON.stringify(researchItem));
  }, [researchItem]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_VARIATIONS, JSON.stringify(variations));
  }, [variations]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify([...savedIndexes]));
  }, [savedIndexes]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_PLATFORM, JSON.stringify(selectedPlatform));
  }, [selectedPlatform]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_TONE, JSON.stringify(selectedTone));
  }, [selectedTone]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_STYLE, JSON.stringify(customStyle));
  }, [customStyle]);

  async function handleGenerate() {
    if (!researchItem || !supabaseConfigured) return;
    setGenerating(true);
    setError('');
    setVariations([]);
    setSavedIndexes(new Set());

    try {
      const apiUrl = `${supabaseUrl}/functions/v1/generate-post`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: researchItem.id,
          platform: selectedPlatform,
          tone: selectedTone,
          customStyle: customStyle.trim() || undefined,
          language,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate posts');
      }

      const { variations: newVariations } = await response.json();
      if (newVariations && newVariations.length > 0) {
        setVariations(newVariations);
        setActiveIndex(0);
        setModalOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveToDrafts(variation: GeneratedVariation, index: number) {
    if (!supabaseConfigured || savedIndexes.has(index)) return;
    setSavingIndex(index);

    const { error: insertErr } = await supabase.from('post_drafts').insert({
      research_topic_id: variation.research_topic_id,
      platform: variation.platform,
      tone: variation.tone,
      content: variation.content,
    });

    if (!insertErr) {
      setSavedIndexes((prev) => new Set(prev).add(index));
    }
    setSavingIndex(null);
  }

  async function handleCopy(content: string, index: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const summaryText = researchItem?.findings?.summary || '';
  const isLongSummary =
    summaryText.split('\n').filter(Boolean).length > 4 || summaryText.length > 500;
  const sourceCount = researchItem?.findings?.sources?.length || 0;

  const activeVariation = variations[activeIndex] || null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t.postGenerator.title}</h1>
        <p className="text-slate-500 mt-1">{t.postGenerator.subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Research Source */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FileText size={14} />
            {t.postGenerator.researchSourceTitle}
          </h2>
          {researchItem ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-800">{researchItem.question}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-xs text-slate-400">
                  {researchItem.career} &middot; {researchItem.industry}
                </p>
                {sourceCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    <Link2 size={10} />
                    {sourceCount} {sourceCount !== 1 ? t.postGenerator.sources : t.postGenerator.source}
                  </span>
                )}
              </div>
              {summaryText && (
                <div className="mt-3">
                  <div
                    className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                      !researchExpanded && isLongSummary ? 'line-clamp-4' : ''
                    }`}
                  >
                    {summaryText}
                  </div>
                  {isLongSummary && (
                    <button
                      onClick={() => setResearchExpanded(!researchExpanded)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      {researchExpanded ? (
                        <>
                          {t.postGenerator.showLess} <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          {t.postGenerator.showFullResearch} <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-400">{t.postGenerator.noResearchSelected}</p>
            </div>
          )}
        </div>

        {/* Target Platform */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{t.postGenerator.targetPlatformTitle}</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlatform('twitter')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                selectedPlatform === 'twitter'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Twitter size={16} />
              {t.common.xTwitter}
            </button>
            <button
              onClick={() => setSelectedPlatform('linkedin')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                selectedPlatform === 'linkedin'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Linkedin size={16} />
              {t.common.linkedin}
            </button>
          </div>
        </div>

        {/* Tone & Style */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{t.postGenerator.presetToneTitle}</h2>
            <div className="flex flex-wrap gap-2">
              {t.postGenerator.toneOptions.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedTone === tone
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
              <MessageSquare size={14} />
              {t.postGenerator.customStyleTitle}
            </h2>
            <p className="text-xs text-slate-400 mb-3">{t.postGenerator.customStyleSubtitle}</p>
            <textarea
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder={t.postGenerator.customStylePlaceholder}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all resize-none"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Generate Button + Open Last Generations */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!researchItem || generating || !supabaseConfigured}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-white text-sm font-medium rounded-xl shadow-sm transition-all ${
              !researchItem || generating || !supabaseConfigured
                ? 'bg-teal-600 opacity-50 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'
            }`}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t.postGenerator.generatingButton}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {t.postGenerator.generateButton}
              </>
            )}
          </button>
          {variations.length > 0 && !modalOpen && (
            <button
              onClick={() => {
                setActiveIndex(0);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <History size={16} />
              {t.postGenerator.openLastGenerations}
            </button>
          )}
        </div>
      </div>

      {/* Carousel Modal */}
      {modalOpen && activeVariation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {activeVariation.platform === 'twitter' ? (
                    <Twitter size={14} className="text-slate-700" />
                  ) : (
                    <Linkedin size={14} className="text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-slate-600">
                    {activeVariation.platform === 'twitter' ? t.common.xTwitter : t.common.linkedin}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{activeVariation.tone}</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Variation Content */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                  {activeIndex + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {t.postGenerator.variationLabels[activeIndex] || `Variatie ${activeIndex + 1}`}
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  {activeIndex + 1} {t.postGenerator.ofLabel} {variations.length}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-[160px] max-h-[400px] overflow-y-auto">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeVariation.content}
                </p>
              </div>

              {/* Dot Indicators */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {variations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeIndex
                        ? 'bg-teal-600 w-6'
                        : savedIndexes.has(i)
                          ? 'bg-teal-300'
                          : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeIndex === 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft size={16} />
                {t.postGenerator.previous}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(activeVariation.content, activeIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 transition-all"
                >
                  {copiedIndex === activeIndex ? (
                    <>
                      <Check size={14} className="text-teal-600" />
                      <span className="text-teal-600">{t.postGenerator.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      {t.postGenerator.copy}
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleSaveToDrafts(activeVariation, activeIndex)}
                  disabled={savedIndexes.has(activeIndex) || savingIndex === activeIndex}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    savedIndexes.has(activeIndex)
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : savingIndex === activeIndex
                        ? 'bg-teal-600 text-white opacity-70'
                        : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                  }`}
                >
                  {savedIndexes.has(activeIndex) ? (
                    <>
                      <Check size={14} />
                      {t.postGenerator.savedToDrafts}
                    </>
                  ) : savingIndex === activeIndex ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t.postGenerator.saving}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {t.postGenerator.saveToDrafts}
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() =>
                  setActiveIndex((prev) => Math.min(variations.length - 1, prev + 1))
                }
                disabled={activeIndex === variations.length - 1}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeIndex === variations.length - 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.postGenerator.next}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
