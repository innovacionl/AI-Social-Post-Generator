import { useState, useEffect, useCallback } from 'react';
import {
  Twitter,
  Linkedin,
  Copy,
  Check,
  Trash2,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Loader2,
  FileText,
  Pencil,
  X as XIcon,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface PostDraft {
  id: string;
  research_topic_id: string | null;
  platform: string;
  tone: string;
  content: string;
  created_at: string;
}

type SortField = 'created_at' | 'platform' | 'tone';
type SortDirection = 'asc' | 'desc';

export default function Drafts() {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterPlatform, setFilterPlatform] = useState<'all' | 'twitter' | 'linkedin'>('all');
  const [filterTone, setFilterTone] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('post_drafts')
      .select('*')
      .is('posted_at', null)
      .order('created_at', { ascending: false });
    setDrafts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  async function handleCopy(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('post_drafts').delete().eq('id', id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  }

  function startEditing(draft: PostDraft) {
    setEditingId(draft.id);
    setEditContent(draft.content);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    const { error } = await supabase
      .from('post_drafts')
      .update({ content: editContent })
      .eq('id', id);
    if (!error) {
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, content: editContent } : d))
      );
    }
    setEditingId(null);
    setSavingEdit(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent('');
  }

  async function handleMarkAsPosted(id: string) {
    setPostingId(id);
    const { error } = await supabase
      .from('post_drafts')
      .update({ posted_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    }
    setPostingId(null);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const uniqueTones = Array.from(new Set(drafts.map((d) => d.tone))).sort();

  const filteredDrafts = drafts
    .filter((d) => {
      if (filterPlatform !== 'all' && d.platform !== filterPlatform) return false;
      if (filterTone !== 'all' && d.tone !== filterTone) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!d.content.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      return a[sortField].localeCompare(b[sortField]) * dir;
    });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.drafts.title}</h1>
          <p className="text-slate-500 mt-1">{t.drafts.subtitle}</p>
        </div>
        <span className="text-sm text-slate-400 mt-1">
          {filteredDrafts.length} {filteredDrafts.length !== 1 ? t.drafts.draftPlural : t.drafts.draftSingular}
        </span>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.drafts.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-all ${
              showFilters
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            {t.drafts.filtersButton}
          </button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{t.drafts.platformLabel}</span>
              {(['all', 'twitter', 'linkedin'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                    filterPlatform === p
                      ? 'border-teal-300 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {p === 'all' ? t.drafts.platformAll : p === 'twitter' ? t.common.xTwitter : t.common.linkedin}
                </button>
              ))}
            </div>

            {uniqueTones.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{t.drafts.toneLabel}</span>
                <select
                  value={filterTone}
                  onChange={(e) => setFilterTone(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded-md text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                >
                  <option value="all">{t.drafts.allTones}</option>
                  {uniqueTones.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-slate-500">{t.drafts.sortBy}</span>
              {([
                { field: 'created_at' as SortField, label: t.drafts.sortDate },
                { field: 'platform' as SortField, label: t.drafts.sortPlatform },
                { field: 'tone' as SortField, label: t.drafts.sortTone },
              ]).map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                    sortField === field
                      ? 'border-teal-300 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  {sortField === field && (
                    <ArrowUpDown size={10} className="opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drafts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">
            {drafts.length === 0 ? t.drafts.emptyNoSaved : t.drafts.emptyNoMatch}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {drafts.length === 0 ? t.drafts.emptyNoSavedSub : t.drafts.emptyNoMatchSub}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => {
            const isEditing = editingId === draft.id;
            return (
              <div
                key={draft.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {draft.platform === 'twitter' ? (
                        <Twitter size={13} className="text-slate-700" />
                      ) : (
                        <Linkedin size={13} className="text-blue-600" />
                      )}
                      <span className="text-xs font-medium text-slate-600">
                        {draft.platform === 'twitter' ? t.common.xTwitter : t.common.linkedin}
                      </span>
                    </div>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="text-xs text-slate-400">{draft.tone}</span>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(draft.created_at)}</span>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4">
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2.5 text-sm text-slate-700 bg-slate-50 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-y"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {draft.content}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(draft.id)}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-all"
                      >
                        {savingEdit ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        {t.drafts.saveChanges}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        <XIcon size={12} />
                        {t.drafts.cancel}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(draft)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        <Pencil size={12} />
                        {t.drafts.edit}
                      </button>
                      <button
                        onClick={() => handleCopy(draft.content, draft.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        {copiedId === draft.id ? (
                          <>
                            <Check size={12} className="text-teal-600" />
                            <span className="text-teal-600">{t.drafts.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            {t.drafts.copy}
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleMarkAsPosted(draft.id)}
                          disabled={postingId === draft.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-all"
                        >
                          {postingId === draft.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {t.drafts.markAsPosted}
                        </button>
                        <button
                          onClick={() => handleDelete(draft.id)}
                          disabled={deletingId === draft.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all"
                        >
                          {deletingId === draft.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          {t.drafts.delete}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
