'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import BenthicIcon from '@/components/brand/BenthicIcon';
import { loginWithPassword, setToken, clearToken, getToken, subscribeAuthChanged } from '@/lib/auth';
import { useDashboardStore } from '@/lib/store';

const devDefaults =
  process.env.NODE_ENV === 'development'
    ? { email: 'bar-reef@sliot.local', password: 'user123' }
    : { email: '', password: '' };

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useDashboardStore();
  const [email, setEmail] = useState(devDefaults.email);
  const [password, setPassword] = useState(devDefaults.password);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    const sync = () => setHasToken(Boolean(getToken()));
    sync();
    return subscribeAuthChanged(sync);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    try {
      const token = await loginWithPassword(email.trim(), password);
      setToken(token);
      router.push('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Sign-in failed. Check your credentials or try again shortly.';
      setError(message);
      clearToken();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--accent-cyan) 12%, transparent), transparent 55%), var(--bg-primary)',
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg border cursor-pointer"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" aria-hidden>
            <BenthicIcon size={52} />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Benthic Guardian
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Coral reef temperature monitoring and bleaching risk assessment
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-xl border p-6 sm:p-7"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="mb-5">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Sign in
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Access your reef monitoring workspace
            </p>
          </div>

          {hasToken && (
            <div
              className="mb-4 rounded-lg border px-3 py-2.5 text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
              role="status"
            >
              You already have an active session in this browser. Signing in again will replace it.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="username"
                placeholder="you@institution.org"
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none disabled:opacity-60 focus:border-[var(--accent-cyan)]"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none disabled:opacity-60 focus:border-[var(--accent-cyan)]"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg border px-3 py-2.5 text-sm"
                style={{
                  borderColor: 'rgba(255, 82, 82, 0.45)',
                  background: 'rgba(255, 82, 82, 0.08)',
                  color: 'var(--danger-coral)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {hasToken && (
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  setError(null);
                  router.refresh();
                }}
                disabled={loading}
                className="w-full rounded-lg border px-3 py-2 text-sm cursor-pointer disabled:opacity-60"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Sign out of this browser
              </button>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          Team Terronix
        </p>
      </div>
    </div>
  );
}
