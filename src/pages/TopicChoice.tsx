import { useState, useEffect } from 'react';
import { Sparkles, Plus, Check, Loader2 } from 'lucide-react';
import { supabase, supabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

const STORAGE_KEY_CAREER = 'topics_career';
const STORAGE_KEY_INDUSTRY = 'topics_industry';
const STORAGE_KEY_TOPIC = 'topics_topic';
const STORAGE_KEY_QUESTIONS = 'topics_questions';
const STORAGE_KEY_ADDED = 'topics_added';

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function TopicChoice() {
  const { t } = useI18n();
  const [career, setCareer] = useState(() => loadSession(STORAGE_KEY_CAREER, ''));
  const [industry, setIndustry] = useState(() => loadSession(STORAGE_KEY_INDUSTRY, ''));
  const [topic, setTopic] = useState(() => loadSession(STORAGE_KEY_TOPIC, ''));
  const [questions, setQuestions] = useState<string[]>(() => loadSession(STORAGE_KEY_QUESTIONS, []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedQuestions, setAddedQuestions] = useState<Set<number>>(() => {
    const arr = loadSession<number[]>(STORAGE_KEY_ADDED, []);
    return new Set(arr);
  });
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_CAREER, JSON.stringify(career));
  }, [career]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_INDUSTRY, JSON.stringify(industry));
  }, [industry]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_TOPIC, JSON.stringify(topic));
  }, [topic]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_ADDED, JSON.stringify([...addedQuestions]));
  }, [addedQuestions]);

  async function handleGenerateQuestions() {
    if (!career.trim() || !industry.trim()) {
      setError(t.topicChoice.errorFillBoth);
      return;
    }

    setLoading(true);
    setError('');
    setQuestions([]);
    setAddedQuestions(new Set());

    try {
      const apiUrl = `${supabaseUrl}/functions/v1/generate-questions`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          career: career.trim(),
          industry: industry.trim(),
          topic: topic.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t.topicChoice.errorGeneric);
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.topicChoice.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToResearch(question: string, index: number) {
    if (!supabaseConfigured) return;
    setAddingIndex(index);
    try {
      const { error: insertError } = await supabase.from('research_topics').insert({
        question,
        career: career.trim(),
        industry: industry.trim(),
        status: 'Pending',
      });

      if (insertError) throw insertError;
      setAddedQuestions((prev) => new Set([...prev, index]));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.topicChoice.errorFailed);
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t.topicChoice.title}</h1>
        <p className="text-slate-500 mt-1">{t.topicChoice.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="career" className="block text-sm font-medium text-slate-700 mb-1.5">
            {t.topicChoice.careerLabel}
          </label>
          <input
            id="career"
            type="text"
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            placeholder={t.topicChoice.careerPlaceholder}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-slate-700 mb-1.5">
            {t.topicChoice.industryLabel}
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder={t.topicChoice.industryPlaceholder}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1.5">
            {t.topicChoice.topicLabel}{' '}
            <span className="text-slate-400 font-normal">{t.topicChoice.topicOptional}</span>
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t.topicChoice.topicPlaceholder}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerateQuestions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t.topicChoice.generating}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {t.topicChoice.generateButton}
            </>
          )}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{t.topicChoice.generatedTitle}</h2>
          <p className="text-sm text-slate-500 mb-4">{t.topicChoice.generatedSubtitle}</p>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-slate-800 text-sm leading-relaxed mb-3">{question}</p>
                <button
                  onClick={() => handleAddToResearch(question, index)}
                  disabled={addedQuestions.has(index) || addingIndex === index}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    addedQuestions.has(index)
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 border border-slate-200'
                  }`}
                >
                  {addedQuestions.has(index) ? (
                    <>
                      <Check size={14} />
                      {t.topicChoice.added}
                    </>
                  ) : addingIndex === index ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t.topicChoice.adding}
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      {t.topicChoice.addToResearch}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
