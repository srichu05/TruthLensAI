import { ReactNode } from 'react'
import { Page, User } from '../App'
import {
  ShieldIcon, SunIcon, MoonIcon, PlusIcon
} from './Icons'
import { useTheme } from '../utils/theme'
import ExpandableNavTabs from './ExpandableNavTabs'

interface Props {
  page: Page
  user: User | null
  navigate: (page: Page) => void
  onLogout?: () => Promise<void> | void
  children: ReactNode
}

export default function DashboardLayout({ page, user, navigate, onLogout, children }: Props) {
  const { resolvedTheme, setTheme } = useTheme()
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TL'

  const toggleLightDark = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
    } else {
      localStorage.removeItem('truthlens_token')
      localStorage.removeItem('truthlens_user')
      localStorage.removeItem('truthlens_supabase_session')
      navigate('landing')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden tech-grid-pattern">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-border bg-card/80 dark:bg-card/75 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate(user ? 'dashboard' : 'landing')}
            className="flex items-center gap-2.5 sm:gap-3 group text-left shrink-0 focus-visible:outline-none"
            title="TruthLens AI"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/25 border border-white/20 group-hover:scale-105 transition-transform">
              <ShieldIcon size={18} className="text-white" />
            </div>
            <div className="text-left hidden xs:block">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-extrabold text-foreground font-display tracking-tight group-hover:text-primary transition-colors">
                  TruthLens
                </span>
                <span className="text-[10px] font-mono font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded border border-primary/25">
                  AI v2.4
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 radar-pulse" />
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  Evidence Engine Active
                </span>
              </div>
            </div>
          </button>

          {/* Breadcrumb separator */}
          <div className="hidden md:block h-5 w-px bg-border/80 shrink-0" />

          {/* Breadcrumb text */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-muted-foreground truncate">
            <span className="text-foreground font-semibold uppercase tracking-wider truncate">
              {page.replace(/-/g, ' ')}
            </span>
            <span>/</span>
            <span className="text-primary font-medium">TRUTHLENS-CORE</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Launch Analyzer / New Claim Scan Button */}
          <button
            onClick={() => navigate('analyzer')}
            className="flex items-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl bg-primary text-white text-xs font-bold font-sans shadow-md shadow-primary/25 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all"
            title="Launch Claim Analyzer"
          >
            <PlusIcon size={14} />
            <span className="hidden sm:inline">New Claim Scan</span>
            <span className="sm:hidden">Scan</span>
          </button>

          {/* Live Pipeline Status Badge */}
          <div className="hidden lg:inline-flex items-center gap-2 bg-secondary/80 border border-border px-2.5 py-1.5 rounded-full text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse" />
            <span className="text-muted-foreground">NLP & ML Pipeline Online</span>
          </div>

          {/* Quick theme toggle */}
          <button
            onClick={toggleLightDark}
            className="p-2 sm:p-2.5 rounded-xl bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? <SunIcon size={15} className="text-amber-400" /> : <MoonIcon size={15} className="text-primary" />}
          </button>

          {/* User profile pill or Sign In button */}
          {user ? (
            <button
              onClick={() => navigate('profile')}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-card hover:bg-secondary border border-border hover:border-primary/30 transition-all text-left group cursor-pointer"
              title="View Profile & Security"
              aria-label="View Profile"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {initials}
              </div>
              <div className="hidden md:block min-w-0 max-w-[120px]">
                <p className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">{user.email}</p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary hover:text-white border border-border text-foreground text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Width Content Area with calibrated bottom clearance for floating navigation tabs */}
      <main className="flex-1 overflow-y-auto bg-background p-0 pb-20 sm:pb-[88px] scroll-smooth">
        {children}
      </main>

      {/* Skiper96-Inspired Floating Expandable Navigation Bar */}
      <ExpandableNavTabs
        page={page}
        user={user}
        navigate={navigate}
        onLogout={handleLogout}
      />
    </div>
  )
}
