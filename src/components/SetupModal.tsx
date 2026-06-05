import { useState } from 'react';
import {
  X,
  GitFork,
  Import,
  Key,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

const SETUP_DISMISSED_KEY = 'postcraft_setup_dismissed';

const apiKeys = [
  {
    name: 'GEMINI_API_KEY',
    label: 'Gemini API Key',
    description: 'Powers AI research and content generation.',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get your key from Google AI Studio',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    description: 'Used for advanced post generation with Claude.',
    link: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'Get your key from Anthropic Console',
  },
];

interface SetupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SetupModal({ open, onClose }: SetupModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function handleCopy(name: string) {
    navigator.clipboard.writeText(name);
    setCopiedKey(name);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function handleDone() {
    localStorage.setItem(SETUP_DISMISSED_KEY, 'true');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl mx-4 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {t.setupModal.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.setupModal.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex mx-7 border-b border-slate-700/60">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              step === 1
                ? 'text-teal-300 border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              1
            </span>
            <GitFork size={15} />
            {t.setupModal.stepFork}
          </button>
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              step === 2
                ? 'text-teal-300 border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              2
            </span>
            <Import size={15} />
            {t.setupModal.stepImport}
          </button>
          <button
            onClick={() => setStep(3)}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              step === 3
                ? 'text-teal-300 border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              3
            </span>
            <Key size={15} />
            {t.setupModal.stepApiKeys}
          </button>
        </div>

        {/* Step content */}
        <div className="px-7 py-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && <StepFork />}
          {step === 2 && <StepImport />}
          {step === 3 && <StepKeys copiedKey={copiedKey} onCopy={handleCopy} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-slate-700/60 bg-slate-900/80">
          {step === 1 ? (
            <>
              <div />
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t.setupModal.nextImport}
                <ChevronRight size={16} />
              </button>
            </>
          ) : step === 2 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
                {t.setupModal.back}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t.setupModal.nextApiKeys}
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
                {t.setupModal.back}
              </button>
              <button
                onClick={handleDone}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t.setupModal.done}
                <Check size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepFork() {
  const { t } = useI18n();
  const f = t.setupModal.fork;
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <p className="text-sm font-medium text-slate-200 mb-4">{f.intro}</p>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">{f.step1}</p>
          </li>
          <li className="pl-9 -mt-1">
            <a
              href="https://github.com/wsayer1/AI-Social-Post-Generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              github.com/wsayer1/AI-Social-Post-Generator
              <ExternalLink size={13} />
            </a>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">
              {f.step2before}
              <strong className="text-white">{f.step2fork}</strong>
              {f.step2after}
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">{f.step3}</p>
          </li>
        </ol>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-700/50">
        <img
          src="/fork_button.png"
          alt="GitHub repository page showing the Fork button highlighted"
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}

function StepImport() {
  const { t } = useI18n();
  const im = t.setupModal.import;
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <p className="text-sm font-medium text-slate-200 mb-4">{im.intro}</p>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">
              {im.step1before}
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                {im.step1link}
              </a>
              {im.step1after}
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">
              {im.step2before}
              <strong className="text-white">{im.step2github}</strong>
              {im.step2after}
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">{im.step3}</p>
          </li>
        </ol>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-700/50">
        <img
          src="/Github_button.png"
          alt="Bolt home page showing the GitHub button at the bottom of the prompt area"
          className="w-full h-auto object-contain"
        />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">{im.note}</p>
    </div>
  );
}

function StepKeys({
  copiedKey,
  onCopy,
}: {
  copiedKey: string | null;
  onCopy: (name: string) => void;
}) {
  const { t } = useI18n();
  const k = t.setupModal.keys;
  return (
    <div className="space-y-5">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <p className="text-sm font-medium text-slate-200 mb-3">{k.intro}</p>
        <ol className="space-y-2.5">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">
              {k.step1before}
              <strong className="text-white">{k.step1settings}</strong>
              {k.step1after}
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <p className="text-sm text-slate-300">{k.step2}</p>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        {apiKeys.map(({ name, label, description, link, linkLabel }) => (
          <div
            key={name}
            className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-teal-400" />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </div>
              <button
                onClick={() => onCopy(name)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 transition-colors"
              >
                {copiedKey === name ? (
                  <>
                    <Check size={13} className="text-green-400" />
                    <span className="text-green-400">{k.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    {k.copyName}
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-950/60 rounded-lg px-3 py-2 mb-2.5">
              <code className="text-xs font-mono text-amber-300">{name}=your_key_here</code>
            </div>
            <p className="text-xs text-slate-400 mb-2">{description}</p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              {linkLabel}
              <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
        <Info size={16} className="text-teal-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-teal-300">{k.importantTitle}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{k.importantBody}</p>
        </div>
      </div>
    </div>
  );
}

export { SETUP_DISMISSED_KEY };
