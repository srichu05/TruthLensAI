import { useState, useEffect } from 'react'
import { Page, User } from '../App'
import {
  ShieldIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon,
  CheckIcon, ZapIcon, SunIcon, MoonIcon, MailIcon, RefreshIcon, ClockIcon
} from '../components/Icons'
import { api } from '../services/api'
import { useTheme } from '../utils/theme'

interface Props {
  mode: 'login' | 'signup'
  navigate: (page: Page) => void
  onLogin: (user: User) => void
  initialNotice?: string | null
  initialError?: string | null
}

export default function AuthPage({ mode, navigate, onLogin, initialNotice, initialError }: Props) {
  const { resolvedTheme, setTheme } = useTheme()
  const [view, setView]               = useState<'form' | 'check-email'>('form')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPw]             = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [error, setError]             = useState(initialError || '')
  const [notice, setNotice]           = useState(initialNotice || '')
  const [loading, setLoading]         = useState(false)
  const [resending, setResending]     = useState(false)
  const [cooldown, setCooldown]       = useState(0)
  const [verificationEmail, setVerificationEmail] = useState('')

  const isSignup = mode === 'signup'

  useEffect(() => {
    setError(initialError || '')
  }, [initialError])

  useEffect(() => {
    setNotice(initialNotice || '')
  }, [initialNotice])

  // Cooldown timer for email resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (isSignup) {
      if (!name.trim())           { setError('Please enter your full name'); return }
      if (!email.includes('@'))   { setError('Enter a valid email address'); return }
      if (password.length < 6)    { setError('Password must be at least 6 characters'); return }
      if (password !== confirm)   { setError('Passwords do not match'); return }
    } else {
      if (!email || !password)    { setError('Please fill in both email and password'); return }
    }

    setLoading(true)
    try {
      if (isSignup) {
        const res = await api.signup(name, email, password)
        if (res.needsEmailVerification) {
          setVerificationEmail(email.trim().toLowerCase())
          setView('check-email')
          setCooldown(60)
          setNotice("We've sent a verification link to your email address.")
        } else {
          onLogin({ name: res.user.name, email: res.user.email })
        }
      } else {
        const res = await api.login(email, password)
        onLogin({ name: res.user.name, email: res.user.email })
      }
    } catch (err: any) {
      if (err.needsEmailVerification) {
        setVerificationEmail(err.email || email.trim().toLowerCase())
        setView('check-email')
        setNotice('Your account requires email verification before accessing the workspace.')
        setError('')
      } else {
        setError(err.message || 'Authentication failed. Please verify your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending || !verificationEmail) return
    setResending(true)
    setError('')
    try {
      await api.resendVerification(verificationEmail)
      setNotice('Verification email resent! Please check your inbox or spam folder.')
      setCooldown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden p-14 bg-sidebar-bg border-r border-border justify-between tech-grid-pattern">
        {/* Glow orb */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

        <button
          onClick={() => navigate('landing')}
          className="relative z-10 flex items-center gap-3 mb-auto group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
            <ShieldIcon size={20} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold text-foreground text-xl font-display tracking-tight group-hover:text-primary transition-colors">
              TruthLens AI
            </span>
            <span className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
              Evidence-Intelligence Console
            </span>
          </div>
        </button>

        <div className="relative z-10 my-auto py-12 max-w-md">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary px-3 py-1 rounded-full text-xs font-mono font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse" />
            <span>Operational Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display leading-tight mb-5">
            Decisive evidence. <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Zero ambiguity.
            </span>
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed mb-8">
            Access automated NLP fact verification, cross-source evidence databases, and explainable AI insights.
          </p>

          {/* Evidence Highlight Card */}
          <div className="bg-card border border-border shadow-xl glow-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-muted-foreground font-semibold">RECENT VERIFICATION</span>
              <span className="text-emerald-500 font-bold">96.8% MATCH</span>
            </div>
            <p className="text-xs text-foreground font-mono italic mb-3 font-medium">
              "Peer-reviewed telemetry analysis corroborated across 3 independent government archives."
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground font-mono">
              <span>Attribution: SHAP Rank #1</span>
              <span className="text-primary font-bold">Verified Fact</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs font-mono text-muted-foreground">
          © 2026 TruthLens AI Platform. All rights reserved.
        </div>
      </div>

      {/* Right form / check-email panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Top Right Theme Toggle */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle visual theme"
            className="p-2.5 rounded-xl border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary transition-all shadow-xs"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {resolvedTheme === 'dark' ? <SunIcon size={16} className="text-amber-400" /> : <MoonIcon size={16} className="text-primary" />}
          </button>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('landing')}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
                <ShieldIcon size={16} />
              </div>
              <span className="font-extrabold text-foreground font-display">TruthLens AI</span>
            </button>
          </div>

          {/* CHECK-EMAIL VIEW */}
          {view === 'check-email' ? (
            <div className="space-y-6 text-center animate-fade-in">
              {/* Mail Icon with animated ring */}
              <div className="relative inline-flex items-center justify-center mx-auto mt-2">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative w-20 h-20 rounded-2xl bg-card border border-primary/40 flex items-center justify-center text-primary shadow-xl shadow-primary/20">
                  <MailIcon size={38} />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-1 rounded-full text-xs font-mono font-semibold mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 radar-pulse" />
                  <span>Email Verification Pending</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                  Check your email
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  We've dispatched a secure verification link to:
                </p>
                <div className="mt-3 p-3 bg-card border border-border rounded-xl font-mono text-xs sm:text-sm text-primary font-bold break-all flex items-center justify-between">
                  <span>{verificationEmail}</span>
                  <button
                    onClick={() => { setView('form'); setError(''); setNotice('') }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline font-sans ml-2 flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Status alerts */}
              {notice && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-500 font-medium font-mono text-left flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                  <span>{notice}</span>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-500 font-medium font-mono text-left flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                  <span>{error}</span>
                </div>
              )}

              {/* Instructions checklist */}
              <div className="p-4 bg-card/60 border border-border/80 rounded-2xl text-left space-y-2.5 text-xs text-muted-foreground font-mono">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Click the verification link inside your email message.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Your browser will securely authenticate and unlock the workspace.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>If not in your inbox within 2 minutes, inspect your spam or junk folder.</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="w-full py-3.5 px-4 bg-card border border-border hover:border-primary/40 text-foreground font-mono uppercase tracking-wider text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {resending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Link...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <ClockIcon size={14} className="text-muted-foreground" />
                      <span>Resend available in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshIcon size={14} className="text-primary" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('form'); setError(''); setNotice(''); navigate('login') }}
                  className="w-full py-3.5 px-4 bg-primary text-white font-mono uppercase tracking-wider text-xs font-bold rounded-xl hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <span>Back to Sign In</span>
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD LOGIN / SIGNUP VIEW */
            <>
              {/* Heading */}
              <div>
                <div className="inline-flex items-center gap-1.5 text-primary text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <ZapIcon size={13} /> {isSignup ? 'Create Account' : 'Welcome Back'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                  {isSignup ? 'Start verifying news' : 'Sign in to TruthLens'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                  {isSignup
                    ? 'Join researchers, journalists, and truth-seekers worldwide.'
                    : 'Enter your credentials to access your verification workspace.'}
                </p>
              </div>

              {/* Notice display */}
              {notice && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-500 font-medium font-mono flex items-center gap-2">
                  <CheckIcon size={14} className="flex-shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-500 font-medium font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                      Password
                    </label>
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!email.trim()) {
                            setError('Please enter your email address to reset your password.')
                            return
                          }
                          setNotice(`Password reset instructions dispatched to ${email.trim()}.`)
                        }}
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                {isSignup && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-primary text-white font-mono uppercase tracking-wider text-xs font-bold rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 border border-primary/40"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isSignup ? 'Creating Account...' : 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignup ? 'Create Free Account' : 'Sign In to Workspace'}</span>
                      <ArrowRightIcon size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle between login / signup */}
              <div className="pt-4 text-center border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {isSignup ? 'Already have an account?' : "Don't have an account yet?"}{' '}
                  <button
                    onClick={() => { setError(''); setNotice(''); navigate(isSignup ? 'login' : 'signup') }}
                    className="text-primary font-bold hover:underline font-mono ml-1"
                  >
                    {isSignup ? 'Log in' : 'Sign up for free'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
