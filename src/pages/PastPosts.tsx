import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import {
  Twitter,
  Linkedin,
  Loader2,
  Archive,
  ChevronDown,
  ChevronUp,
  Calendar,
  Search,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface PastPost {
  id: string;
  platform: string;
  tone: string;
  content: string;
  created_at: string;
  posted_at: string;
}

const LINE_HEIGHT_REM = 1.5;
const VISIBLE_LINES = 6;
const CLAMP_HEIGHT = `${LINE_HEIGHT_REM * VISIBLE_LINES}rem`;

export default function PastPosts() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<PastPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPosts = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('post_drafts')
      .select('*')
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filtered = posts.filter((p) =>
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.pastPosts.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.pastPosts.subtitleCount} {posts.length} totaal.
        </p>
      </div>

      {posts.length > 0 && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t.pastPosts.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Archive size={40} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">
            {posts.length === 0 ? t.pastPosts.emptyNoPostsTitle : t.pastPosts.emptyNoMatchTitle}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {posts.length === 0 ? t.pastPosts.emptyNoPostsSub : t.pastPosts.emptyNoMatchSub}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => {
            const isExpanded = expandedIds.has(post.id);
            return (
              <div
                key={post.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div className="px-5 pt-4 pb-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {post.platform === 'twitter' ? (
                      <Twitter size={12} />
                    ) : (
                      <Linkedin size={12} />
                    )}
                    {post.platform === 'twitter' ? t.common.xTwitter : t.common.linkedin}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{post.tone}</span>
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={12} />
                    {t.pastPosts.postedOn} {formatDate(post.posted_at)}
                  </div>
                </div>

                <div className="px-5 pb-2">
                  <div
                    className="text-sm text-slate-700 whitespace-pre-wrap overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isExpanded ? '1000rem' : CLAMP_HEIGHT,
                      lineHeight: `${LINE_HEIGHT_REM}rem`,
                    }}
                  >
                    {post.content}
                  </div>
                </div>

                <button
                  onClick={() => toggleExpand(post.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-teal-600 hover:bg-slate-50 transition-colors border-t border-slate-100"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={14} />
                      {t.pastPosts.showLess}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      {t.pastPosts.showMore}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
