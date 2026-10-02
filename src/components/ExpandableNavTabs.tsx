import { useState, useRef, useEffect } from 'react'
import { Page, User, PROTECTED_PAGES } from '../App'
import {
  HomeIcon, ZapIcon, ClockIcon, BookmarkIcon,
  SettingsIcon, UserIcon, LogoutIcon, NewspaperIcon, TrendingUpIcon
} from './Icons'

interface Props {
  page: Page
  user: User | null
  navigate: (page: Page) => void
  onLogout?: () => Promise<void> | void
}

interface NavItem {
  id: Page
  label: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string
  highlight?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',        Icon: HomeIcon,         badge: 'LIVE' },
  { id: 'analyzer',      label: 'Claim Analyzer',   Icon: ZapIcon,          highlight: true },
  { id: 'analytics',     label: 'Analytics',        Icon: TrendingUpIcon },
  { id: 'history',       label: 'History',          Icon: ClockIcon },
  { id: 'real-articles', label: 'Evidence',         Icon: NewspaperIcon },
  { id: 'saved',         label: 'Saved',            Icon: BookmarkIcon },
]

const SECONDARY_NAV: NavItem[] = [
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'profile',  label: 'Profile',  Icon: UserIcon },
]

export default function ExpandableNavTabs({ page, user, navigate, onLogout }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleNavClick = (targetPage: Page) => {
    if (!user && PROTECTED_PAGES.includes(targetPage)) {
      navigate('login')
    } else {
      navigate(targetPage)
    }
  }

  const handleLogoutClick = async () => {
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
    <nav
      ref={navRef}
      aria-label="Intelligence Navigation"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)]"
    >
      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full sm:rounded-2xl bg-card/90 dark:bg-[#0b111e]/90 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-2xl shadow-blue-950/20 dark:shadow-black/70 overflow-x-auto no-scrollbar">
        {/* Primary Workspace Navigation */}
        {PRIMARY_NAV.map((item) => {
          const isSelected = page === item.id || (item.id === 'real-articles' && page === 'real-article-detail')
          const isHovered = !isTouchDevice && hoveredId === item.id
          const isExpanded = isSelected || isHovered
          const isProtected = !user && PROTECTED_PAGES.includes(item.id)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex items-center h-9 sm:h-10 rounded-full text-xs font-semibold select-none outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold px-3 sm:px-3.5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70 dark:hover:bg-white/5 px-2.5 sm:px-3'
              }`}
              title={item.label}
              aria-label={item.label}
              aria-current={isSelected ? 'page' : undefined}
            >
              <item.Icon
                size={17}
                className={`shrink-0 transition-transform duration-200 ${
                  isSelected
                    ? 'text-white scale-105'
                    : item.highlight
                    ? 'text-primary group-hover:scale-110'
                    : 'text-current group-hover:scale-110'
                }`}
              />

              <div
                className={`grid transition-all duration-300 ease-out overflow-hidden ${
                  isExpanded
                    ? 'grid-cols-[1fr] opacity-100 ml-2 max-w-[140px]'
                    : 'grid-cols-[0fr] opacity-0 ml-0 max-w-0 pointer-events-none'
                }`}
              >
                <span className="overflow-hidden whitespace-nowrap text-xs tracking-tight font-medium">
                  {item.label}
                </span>
              </div>

              {/* Status / Badge dots */}
              {item.badge && !isExpanded && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
              )}
              {isProtected && !isExpanded && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500/80" />
              )}
            </button>
          )
        })}

        {/* Subtle vertical divider between workspace tabs and account tabs */}
        <div className="h-5 w-px bg-border/80 dark:bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

        {/* Secondary Account Navigation */}
        {SECONDARY_NAV.map((item) => {
          const isSelected = page === item.id
          const isHovered = !isTouchDevice && hoveredId === item.id
          const isExpanded = isSelected || isHovered
          const isProtected = !user && PROTECTED_PAGES.includes(item.id)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative flex items-center h-9 sm:h-10 rounded-full text-xs font-semibold select-none outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 ease-out cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold px-3 sm:px-3.5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70 dark:hover:bg-white/5 px-2.5 sm:px-3'
              }`}
              title={item.label}
              aria-label={item.label}
              aria-current={isSelected ? 'page' : undefined}
            >
              <item.Icon
                size={17}
                className={`shrink-0 transition-transform duration-200 ${
                  isSelected ? 'text-white scale-105' : 'text-current group-hover:scale-110'
                }`}
              />

              <div
                className={`grid transition-all duration-300 ease-out overflow-hidden ${
                  isExpanded
                    ? 'grid-cols-[1fr] opacity-100 ml-2 max-w-[140px]'
                    : 'grid-cols-[0fr] opacity-0 ml-0 max-w-0 pointer-events-none'
                }`}
              >
                <span className="overflow-hidden whitespace-nowrap text-xs tracking-tight font-medium">
                  {item.label}
                </span>
              </div>

              {isProtected && !isExpanded && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500/80" />
              )}
            </button>
          )
        })}

        {/* Logout or Sign In action */}
        {user ? (
          <button
            type="button"
            onClick={handleLogoutClick}
            onMouseEnter={() => setHoveredId('logout')}
            onMouseLeave={() => setHoveredId(null)}
            className="group relative flex items-center h-9 sm:h-10 rounded-full px-2.5 sm:px-3 text-xs font-semibold text-muted-foreground hover:text-fake hover:bg-fake-bg/40 transition-all duration-300 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-fake cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogoutIcon size={17} className="shrink-0 text-current group-hover:scale-110 transition-transform duration-200" />
            <div
              className={`grid transition-all duration-300 ease-out overflow-hidden ${
                hoveredId === 'logout'
                  ? 'grid-cols-[1fr] opacity-100 ml-2 max-w-[100px]'
                  : 'grid-cols-[0fr] opacity-0 ml-0 max-w-0 pointer-events-none'
              }`}
            >
              <span className="overflow-hidden whitespace-nowrap text-xs tracking-tight font-medium text-fake">
                Logout
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('login')}
            onMouseEnter={() => setHoveredId('login')}
            onMouseLeave={() => setHoveredId(null)}
            className="group relative flex items-center h-9 sm:h-10 rounded-full px-2.5 sm:px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-all duration-300 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            title="Sign In"
            aria-label="Sign In"
          >
            <UserIcon size={17} className="shrink-0 text-primary group-hover:scale-110 transition-transform duration-200" />
            <div
              className={`grid transition-all duration-300 ease-out overflow-hidden ${
                hoveredId === 'login'
                  ? 'grid-cols-[1fr] opacity-100 ml-2 max-w-[100px]'
                  : 'grid-cols-[0fr] opacity-0 ml-0 max-w-0 pointer-events-none'
              }`}
            >
              <span className="overflow-hidden whitespace-nowrap text-xs tracking-tight font-medium text-primary">
                Sign In
              </span>
            </div>
          </button>
        )}
      </div>
    </nav>
  )
}
