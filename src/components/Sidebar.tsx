import { NavLink } from 'react-router-dom';
import {
  Lightbulb,
  Search,
  PenTool,
  FileText,
  Archive,
  HelpCircle,
} from 'lucide-react';
import { useI18n, Language } from '../lib/i18n';

interface SidebarProps {
  onOpenSetup: () => void;
}

const languages: { code: Language; flag: string; label: string }[] = [
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

export default function Sidebar({ onOpenSetup }: SidebarProps) {
  const { t, language, setLanguage } = useI18n();

  const navItems = [
    { to: '/topics', label: t.sidebar.topicChoice, icon: Lightbulb },
    { to: '/research', label: t.sidebar.research, icon: Search },
    { to: '/posts', label: t.sidebar.postGenerator, icon: PenTool },
    { to: '/drafts', label: t.sidebar.drafts, icon: FileText },
    { to: '/past-posts', label: t.sidebar.pastPosts, icon: Archive },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="px-6 py-6 border-b border-slate-700 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">PostCraft</h1>
          <p className="text-xs text-slate-400 mt-0.5">AI Content Studio</p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {languages.map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              title={label}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-base transition-all ${
                language === code
                  ? 'bg-teal-600/30 ring-1 ring-teal-400/60'
                  : 'hover:bg-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-teal-600/20 text-teal-300 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={onOpenSetup}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <HelpCircle size={16} />
          {t.sidebar.setupGuide}
        </button>
      </div>
    </aside>
  );
}
