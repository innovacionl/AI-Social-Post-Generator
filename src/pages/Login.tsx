import { useState, FormEvent } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const { language } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  const isNl = language === 'nl';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const err =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

    if (err) {
      setError(translateError(err, isNl));
      setLoading(false);
    } else if (mode === 'signup') {
      setSignedUp(true);
      setLoading(false);
    }
    // on signIn success, App.tsx will re-render via session change
  }

  function translateError(msg: string, nl: boolean): string {
    if (msg.includes('Invalid login credentials'))
      return nl ? 'Ongeldig e-mailadres of wachtwoord.' : 'Invalid email or password.';
    if (msg.includes('Email not confirmed'))
      return nl ? 'E-mailadres is nog niet bevestigd.' : 'Email not confirmed.';
    if (msg.includes('User already registered'))
      return nl ? 'Dit e-mailadres is al geregistreerd.' : 'This email is already registered.';
    if (msg.includes('Password should be'))
      return nl ? 'Wachtwoord moet minimaal 6 tekens zijn.' : 'Password must be at least 6 characters.';
    return msg;
  }

  function switchMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
    setSignedUp(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.08),_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(20,184,166,0.05),_transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600/20 border border-teal-500/30 mb-4">
            <Sparkles size={22} className="text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Socials Generator</h1>
          <p className="text-slate-400 text-sm mt-1">AI Content Studio</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === 'signin'
              ? (isNl ? 'Inloggen' : 'Sign in')
              : (isNl ? 'Account aanmaken' : 'Create account')}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {mode === 'signin'
              ? (isNl ? 'Welkom terug! Vul je gegevens in.' : 'Welcome back! Enter your details.')
              : (isNl ? 'Maak een nieuw account aan.' : 'Create a new account to get started.')}
          </p>

          {signedUp ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-teal-400" />
              </div>
              <p className="text-white font-medium mb-1">
                {isNl ? 'Account aangemaakt!' : 'Account created!'}
              </p>
              <p className="text-slate-400 text-sm mb-4">
                {isNl
                  ? 'Je kunt nu inloggen met je gegevens.'
                  : 'You can now sign in with your credentials.'}
              </p>
              <button
                onClick={() => { setMode('signin'); setSignedUp(false); }}
                className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
              >
                {isNl ? 'Naar inloggen' : 'Go to sign in'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  {isNl ? 'E-mailadres' : 'Email'}
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder={isNl ? 'naam@voorbeeld.nl' : 'name@example.com'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-600/60 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  {isNl ? 'Wachtwoord' : 'Password'}
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-600/60 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-3.5 py-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-900/50 disabled:text-teal-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-teal-900/30 mt-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" />
                    {isNl ? 'Bezig...' : 'Loading...'}</>
                ) : mode === 'signin' ? (
                  isNl ? 'Inloggen' : 'Sign in'
                ) : (
                  isNl ? 'Account aanmaken' : 'Create account'
                )}
              </button>
            </form>
          )}

          {/* Toggle mode */}
          {!signedUp && (
            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === 'signin'
                ? (isNl ? 'Nog geen account?' : "Don't have an account?")
                : (isNl ? 'Heb je al een account?' : 'Already have an account?')}{' '}
              <button
                onClick={switchMode}
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                {mode === 'signin'
                  ? (isNl ? 'Registreer' : 'Sign up')
                  : (isNl ? 'Inloggen' : 'Sign in')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
