import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, FlaskConical, X, ExternalLink, PenTool, Loader2, Clock, Brain, ArrowRight, RefreshCw, RotateCcw } from 'lucide-react';
import { supabase, supabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface ResearchTopic {
  id: string;
  question: string;
  career: string;
  industry: string;
  status: string;
  findings: { summary?: string; sources?: { title: string; url: string }[] } | null;
  gemini_interaction_id: string | null;
  created_at: string;
}

const statusColorMap: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Complete: 'bg-green-50 text-green-700 border-green-200',
};

const POLL_INTERVAL = 12000;

export default function Research() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<ResearchTopic | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [thinkingSummaries, setThinkingSummaries] = useState<Record<string, string>>({});
  const [lastPollTimes, setLastPollTimes] = useState<Record<string, number>>({});
  const [lastGeminiStatuses, setLastGeminiStatuses] = useState<Record<string, string>>({});
  const [checkingNowIds, setCheckingNowIds] = useState<Set<string>>(new Set());
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollStartTimes = useRef<Record<string, number>>({});

  // 1-second ticker to keep elapsed / last-checked displays live
  useEffect(() => {
    if (pollingIds.size === 0) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [pollingIds.size]);

  useEffect(() => {
    fetchTopics();
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    if (topics.length > 0) {
      topics.forEach((tp) => {
        if (tp.status === 'In Progress' && tp.gemini_interaction_id && !pollTimers.current[tp.id]) {
          startPolling(tp.id);
        }
      });
    }
  }, [topics]);

  // suppress unused-var warning for tick; it drives re-renders so elapsed/ago helpers are current
  void tick;

  async function fetchTopics() {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('research_topics')
      .select('*')
      .order('created_at', { ascending: false });

    if (!fetchErr && data) setTopics(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!supabaseConfigured) return;
    setDeletingId(id);
    stopPolling(id);
    const { error: delErr } = await supabase.from('research_topics').delete().eq('id', id);
    if (!delErr) {
      setTopics((prev) => prev.filter((tp) => tp.id !== id));
      if (selectedTopic?.id === id) setSelectedTopic(null);
    }
    setDeletingId(null);
  }

  function stopPolling(id: string) {
    if (pollTimers.current[id]) {
      clearInterval(pollTimers.current[id]);
      delete pollTimers.current[id];
    }
    delete pollStartTimes.current[id];
    setPollingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const pollForResults = useCallback(async (id: string) => {
    try {
      const apiUrl = `${supabaseUrl}/functions/v1/conduct-research`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId: id, action: 'poll' }),
      });

      if (!response.ok) return;

      const data = await response.json();

      setLastPollTimes((prev) => ({ ...prev, [id]: Date.now() }));

      if (data.researchStatus || data.normalizedStatus) {
        setLastGeminiStatuses((prev) => ({
          ...prev,
          [id]: data.researchStatus || data.normalizedStatus,
        }));
      }

      if (data.thinkingSummary) {
        setThinkingSummaries((prev) => ({ ...prev, [id]: data.thinkingSummary }));
      }

      if (data.status === 'completed' && data.topic) {
        stopPolling(id);
        setTopics((prev) => prev.map((tp) => (tp.id === id ? data.topic : tp)));
        setSelectedTopic((prev) => (prev?.id === id ? data.topic : prev));
        setThinkingSummaries((prev) => { const next = { ...prev }; delete next[id]; return next; });
        setLastPollTimes((prev) => { const next = { ...prev }; delete next[id]; return next; });
        setLastGeminiStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
      } else if (data.status === 'failed') {
        stopPolling(id);
        setError(data.error || 'Research failed');
        setTopics((prev) =>
          prev.map((tp) =>
            tp.id === id ? { ...tp, status: 'Pending', gemini_interaction_id: null } : tp
          )
        );
        setSelectedTopic((prev) =>
          prev?.id === id ? { ...prev, status: 'Pending', gemini_interaction_id: null } : prev
        );
      }
    } catch {
      // network error — will retry on next interval
    }
  }, []);

  function startPolling(id: string) {
    if (pollTimers.current[id]) return;
    if (!pollStartTimes.current[id]) pollStartTimes.current[id] = Date.now();
    setPollingIds((prev) => new Set(prev).add(id));
    pollTimers.current[id] = setInterval(() => pollForResults(id), POLL_INTERVAL);
    pollForResults(id);
  }

  async function handleConductResearch(id: string) {
    if (!supabaseConfigured) return;
    setStartingId(id);
    setError('');

    setTopics((prev) =>
      prev.map((tp) => (tp.id === id ? { ...tp, status: 'In Progress' } : tp))
    );
    if (selectedTopic?.id === id) {
      setSelectedTopic((prev) => (prev ? { ...prev, status: 'In Progress' } : prev));
    }

    try {
      const apiUrl = `${supabaseUrl}/functions/v1/conduct-research`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId: id, action: 'start', language }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start research');
      }

      const data = await response.json();
      if (data.status === 'started') {
        setTopics((prev) =>
          prev.map((tp) =>
            tp.id === id
              ? { ...tp, status: 'In Progress', gemini_interaction_id: data.interactionId }
              : tp
          )
        );
        startPolling(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed to start');
      setTopics((prev) =>
        prev.map((tp) => (tp.id === id ? { ...tp, status: 'Pending' } : tp))
      );
      if (selectedTopic?.id === id) {
        setSelectedTopic((prev) => (prev ? { ...prev, status: 'Pending' } : prev));
      }
    } finally {
      setStartingId(null);
    }
  }

  async function handleCheckNow(id: string) {
    setCheckingNowIds((prev) => new Set(prev).add(id));
    await pollForResults(id);
    setCheckingNowIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleReset(id: string) {
    if (!supabaseConfigured) return;
    setResettingIds((prev) => new Set(prev).add(id));
    stopPolling(id);

    await supabase
      .from('research_topics')
      .update({ status: 'Pending', gemini_interaction_id: null })
      .eq('id', id);

    setTopics((prev) =>
      prev.map((tp) =>
        tp.id === id ? { ...tp, status: 'Pending', gemini_interaction_id: null } : tp
      )
    );
    setSelectedTopic((prev) =>
      prev?.id === id ? { ...prev, status: 'Pending', gemini_interaction_id: null } : prev
    );
    setThinkingSummaries((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setLastPollTimes((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setLastGeminiStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });

    setResettingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function handleDraftPost(topic: ResearchTopic) {
    navigate('/posts', { state: { researchTopic: topic } });
  }

  function isResearching(id: string) {
    return startingId === id || pollingIds.has(id);
  }

  function statusLabel(status: string) {
    if (status === 'Pending') return t.research.statusPending;
    if (status === 'In Progress') return t.research.statusInProgress;
    if (status === 'Complete') return t.research.statusComplete;
    return status;
  }

  function formatElapsed(id: string): string {
    const start = pollStartTimes.current[id];
    if (!start) return '';
    const secs = Math.floor((Date.now() - start) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatAgo(id: string): string {
    const last = lastPollTimes[id];
    if (!last) return '';
    const secs = Math.floor((Date.now() - last) / 1000);
    return language === 'nl' ? `${secs}s geleden` : `${secs}s ago`;
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t.research.title}</h1>
        <p className="text-slate-500 mt-1">{t.research.subtitle}</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-3">
            <X size={14} />
          </button>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FlaskConical size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {t.research.emptyTitle}
            <button
              onClick={() => navigate('/topics')}
              className="text-teal-600 hover:underline font-medium"
            >
              {t.research.emptyLinkLabel}
            </button>
            {t.research.emptyAfterLink}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map((topic) => {
            const researching = isResearching(topic.id);
            const isComplete = topic.status === 'Complete';
            const isInProgress = topic.status === 'In Progress';
            const thinking = thinkingSummaries[topic.id];
            const elapsed = formatElapsed(topic.id);
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                      statusColorMap[topic.status] || statusColorMap.Pending
                    }`}
                  >
                    {statusLabel(topic.status)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(topic.id);
                    }}
                    disabled={deletingId === topic.id}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
                    title={t.research.deleteTitle}
                  >
                    {deletingId === topic.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>

                {researching && elapsed && (
                  <p className="text-xs text-blue-500 mb-2 flex items-center gap-1">
                    <Clock size={10} />
                    {t.research.runningFor} {elapsed}
                  </p>
                )}

                <p className="text-sm text-slate-800 leading-relaxed line-clamp-3 mt-2">
                  {topic.question}
                </p>

                {researching && thinking && (
                  <div className="mt-3 flex items-start gap-2 bg-blue-50/60 rounded-lg px-3 py-2">
                    <Brain size={12} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-600 line-clamp-2">{thinking}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!researching && !isComplete) handleConductResearch(topic.id);
                    }}
                    disabled={researching || isComplete}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isComplete
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : researching
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200'
                    }`}
                  >
                    {isComplete ? (
                      <><FlaskConical size={12} />{t.research.researchComplete}</>
                    ) : researching ? (
                      <><Loader2 size={12} className="animate-spin" />{t.research.researching}</>
                    ) : (
                      <><FlaskConical size={12} />{t.research.conductResearch}</>
                    )}
                  </button>

                  {isInProgress && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset(topic.id);
                      }}
                      disabled={resettingIds.has(topic.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      {resettingIds.has(topic.id) ? (
                        <><Loader2 size={12} className="animate-spin" />{t.research.resetting}</>
                      ) : (
                        <><RotateCcw size={12} />{t.research.resetResearch}</>
                      )}
                    </button>
                  )}

                  {isComplete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDraftPost(topic);
                      }}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors"
                    >
                      <PenTool size={12} />
                      {t.research.addToPostGenerator}
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTopic && (
        <DetailModal
          topic={selectedTopic}
          isResearching={isResearching(selectedTopic.id)}
          isCheckingNow={checkingNowIds.has(selectedTopic.id)}
          isResetting={resettingIds.has(selectedTopic.id)}
          thinkingSummary={thinkingSummaries[selectedTopic.id] || null}
          elapsed={formatElapsed(selectedTopic.id)}
          lastCheckedAgo={formatAgo(selectedTopic.id)}
          geminiStatus={lastGeminiStatuses[selectedTopic.id] || null}
          onClose={() => setSelectedTopic(null)}
          onConductResearch={() => handleConductResearch(selectedTopic.id)}
          onCheckNow={() => handleCheckNow(selectedTopic.id)}
          onReset={() => handleReset(selectedTopic.id)}
          onDraftPost={() => handleDraftPost(selectedTopic)}
          statusLabel={statusLabel}
        />
      )}
    </div>
  );
}

function DetailModal({
  topic,
  isResearching,
  isCheckingNow,
  isResetting,
  thinkingSummary,
  elapsed,
  lastCheckedAgo,
  geminiStatus,
  onClose,
  onConductResearch,
  onCheckNow,
  onReset,
  onDraftPost,
  statusLabel,
}: {
  topic: ResearchTopic;
  isResearching: boolean;
  isCheckingNow: boolean;
  isResetting: boolean;
  thinkingSummary: string | null;
  elapsed: string;
  lastCheckedAgo: string;
  geminiStatus: string | null;
  onClose: () => void;
  onConductResearch: () => void;
  onCheckNow: () => void;
  onReset: () => void;
  onDraftPost: () => void;
  statusLabel: (s: string) => string;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              statusColorMap[topic.status] || statusColorMap.Pending
            }`}
          >
            {statusLabel(topic.status)}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">
              {topic.question}
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              {topic.career} &middot; {topic.industry}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t.research.detailFindingsTitle}</h3>
            {isResearching ? (
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <Loader2 size={22} className="animate-spin text-blue-600" />
                    <div className="absolute inset-0 animate-ping opacity-20">
                      <Loader2 size={22} className="text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-semibold">{t.research.detailResearchingTitle}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{t.research.detailResearchingSubtitle}</p>
                  </div>
                </div>

                {/* Elapsed + last-checked row */}
                <div className="flex items-center justify-center gap-4 text-xs text-blue-500 flex-wrap">
                  {elapsed && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {t.research.runningFor} <strong className="text-blue-700">{elapsed}</strong>
                    </span>
                  )}
                  {lastCheckedAgo && (
                    <span className="flex items-center gap-1">
                      <RefreshCw size={11} />
                      {t.research.lastChecked}: <strong className="text-blue-700">{lastCheckedAgo}</strong>
                    </span>
                  )}
                  {!elapsed && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {t.research.detailResearchingTime}
                    </span>
                  )}
                </div>

                {/* Gemini raw status badge */}
                {geminiStatus && (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 text-xs bg-white/80 border border-blue-200 rounded-full px-3 py-1 text-blue-600">
                      <span className="font-medium">{t.research.geminiStatusLabel}:</span>
                      <code className="font-mono">{geminiStatus}</code>
                    </span>
                  </div>
                )}

                {thinkingSummary && (
                  <div className="bg-white/70 rounded-lg px-4 py-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-1.5">
                      <Brain size={11} />
                      {t.research.detailLatestUpdate}
                    </div>
                    <p className="text-xs text-blue-600 leading-relaxed">{thinkingSummary}</p>
                  </div>
                )}

                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : topic.findings?.summary ? (
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto prose prose-sm prose-slate">
                {topic.findings.summary}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400">{t.research.detailNoFindings}</p>
              </div>
            )}
          </div>

          {!isResearching && topic.findings?.sources && topic.findings.sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {t.research.detailSourcesTitle} ({topic.findings.sources.length})
              </h3>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {topic.findings.sources.map((source, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-teal-700 hover:text-teal-800">
                    <ExternalLink size={12} className="shrink-0" />
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isResearching && !topic.findings?.sources?.length && topic.status !== 'In Progress' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{t.research.detailSourcesTitle}</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400">{t.research.detailNoSources}</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 flex gap-3 flex-wrap">
            {topic.status === 'In Progress' && isResearching && (
              <>
                <button
                  onClick={onCheckNow}
                  disabled={isCheckingNow}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {isCheckingNow ? (
                    <><Loader2 size={14} className="animate-spin" />{t.research.checking}</>
                  ) : (
                    <><RefreshCw size={14} />{t.research.checkNow}</>
                  )}
                </button>
                <button
                  onClick={onReset}
                  disabled={isResetting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors"
                >
                  {isResetting ? (
                    <><Loader2 size={14} className="animate-spin" />{t.research.resetting}</>
                  ) : (
                    <><RotateCcw size={14} />{t.research.resetResearch}</>
                  )}
                </button>
              </>
            )}
            {topic.status !== 'Complete' && !isResearching && (
              <button
                onClick={onConductResearch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FlaskConical size={14} />
                {t.research.detailConductButton}
              </button>
            )}
            <button
              onClick={onDraftPost}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            >
              <PenTool size={14} />
              {t.research.detailDraftButton}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {t.research.detailCloseButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
