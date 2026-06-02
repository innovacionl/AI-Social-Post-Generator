import { NavLink } from 'react-router-dom';
import {
  Lightbulb,
  Search,
  PenTool,
  FileText,
  Archive,
  HelpCircle,
} from 'lucide-react';

const navItems = [
  { to: '/topics', label: 'Topic Choice', icon: Lightbulb },
  { to: '/research', label: 'Research', icon: Search },
  { to: '/posts', label: 'Post Generator', icon: PenTool },
  { to: '/drafts', label: 'Drafts', icon: FileText },
  { to: '/past-posts', label: 'Past Posts', icon: Archive },
];

interface SidebarProps {
  onOpenSetup: () => void;
}

export default function Sidebar({ onOpenSetup }: SidebarProps) {

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="px-6 py-6 border-b border-slate-700">
        <h1 className="text-lg font-semibold tracking-tight">PostCraft</h1>
        <p className="text-xs text-slate-400 mt-0.5">AI Content Studio</p>
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
          Setup Guide
        </button>
      </div>
    </aside>
  );
}
