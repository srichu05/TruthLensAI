import { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import NewsAnalyzer from './pages/NewsAnalyzer'
import AnalysisHistory from './pages/AnalysisHistory'
import RealArticles from './pages/RealArticles'
import RealArticleDetail from './pages/RealArticleDetail'
import Profile from './pages/Profile'
import HowItWorks from './pages/HowItWorks'
import SharedResultPage from './pages/SharedResultPage'
import { api, getStoredUser, getToken, setStoredUser, setToken, removeToken, removeStoredUser } from './services/api'
import { supabase } from './services/supabase'

export type Page =
  | 'landing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'analyzer'
  | 'analytics'
  | 'history'
  | 'real-articles'
  | 'real-article-detail'
  | 'saved'
  | 'settings'
  | 'profile'
  | 'how-it-works'

export interface User {
  name: string
  email: string
}

// Strictly protected pages requiring verified authentication
export const PROTECTED_PAGES: Page[] = [
  'dashboard',
  'analytics',
  'history',
  'real-articles',
  'real-article-detail',
  'saved',
  'settings',
  'profile',
]

// Pages rendered within the app layout shell
const DASH_PAGES: Page[] = [
  'dashboard',
  'analyzer',
  'analytics',
  'history',
  'real-articles',
  'real-article-detail',
  'saved',
  'settings',
  'profile',
  'how-it-works'
]

function Wrap({ id, children }: { id: string; children: React.ReactNode }) {
  return <div key={id} className="page-fade min-h-full">{children}</div>
}

function getSharedIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  // Check pathname: /shared/:id
  const pathMatch = window.location.pathname.match(/\/shared\/([^/?#]+)/)
  if (pathMatch && pathMatch[1]) return pathMatch[1]

  // Check search params: ?shared=123
  const searchParams = new URLSearchParams(window.location.search)
  const sharedParam = searchParams.get('shared')
  if (sharedParam) return sharedParam

  // Check hash: #/shared/123
  const hashMatch = window.location.hash.match(/#\/?shared\/([^/?#]+)/)
  if (hashMatch && hashMatch[1]) return hashMatch[1]

  return null
}

function getRealArticleIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const pathMatch = window.location.pathname.match(/\/real-articles\/([^/?#]+)/)
  if (pathMatch && pathMatch[1] && pathMatch[1] !== '') return pathMatch[1]
  const hashMatch = window.location.hash.match(/#\/?real-articles\/([^/?#]+)/)
  if (hashMatch && hashMatch[1] && hashMatch[1] !== '') return hashMatch[1]
  return null
}

function parseInitialPage(): Page {
  if (typeof window === 'undefined') return 'landing'
  const path = window.location.pathname.toLowerCase()
  const hash = window.location.hash.toLowerCase()
  
  if (getRealArticleIdFromUrl()) return 'real-article-detail'
  if (path.includes('/real-articles') || hash.includes('real-articles')) return 'real-articles'
  if (path === '/login' || hash.includes('login')) return 'login'
  if (path === '/signup' || hash.includes('signup')) return 'signup'
  if (path === '/analyzer' || hash.includes('analyzer')) return 'analyzer'
  if (path === '/how-it-works' || hash.includes('how-it-works')) return 'how-it-works'
  if (path === '/dashboard' || hash.includes('dashboard')) return 'dashboard'
  if (path === '/history' || hash.includes('history')) return 'history'
  if (path === '/saved' || hash.includes('saved')) return 'saved'
  if (path === '/settings' || hash.includes('settings')) return 'settings'
  if (path === '/profile' || hash.includes('profile')) return 'profile'
  return 'landing'
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [page, setPage] = useState<Page>(() => parseInitialPage())
  const [sharedId, setSharedId] = useState<string | null>(() => getSharedIdFromUrl())
  const [selectedRealArticleId, setSelectedRealArticleId] = useState<string | number | null>(() => getRealArticleIdFromUrl())
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Detect verification callback errors from URL hash (e.g. #error=access_denied&error_code=otp_expired)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const desc = params.get('error_description') || 'Email verification link is invalid or has expired.'
      setAuthError(desc.replace(/\+/g, ' '))
      setPage('login')
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    const handleLocationChange = () => {
      setSharedId(getSharedIdFromUrl())
      const realId = getRealArticleIdFromUrl()
      if (realId) {
        setSelectedRealArticleId(realId)
        setPage('real-article-detail')
      } else if (window.location.pathname.includes('/real-articles') || window.location.hash.includes('real-articles')) {
        setPage('real-articles')
      }
    }
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  // Synchronize session with Supabase Auth state changes & verify authenticity
  useEffect(() => {
    let isMounted = true

    async function verifyInitialSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!error && data?.session?.user) {
          // If session exists, user is authenticated
          const u: User = {
            name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'User',
            email: data.session.user.email || ''
          }
          if (isMounted) {
            setUser(u)
            setStoredUser({ id: data.session.user.id, name: u.name, email: u.email })
            setToken(data.session.access_token)
            setAuthStatus('authenticated')
          }
        } else {
          // If no active Supabase session, do not rely on raw localStorage tokens
          if (isMounted) {
            setUser(null)
            removeToken()
            removeStoredUser()
            setAuthStatus('unauthenticated')
          }
        }
      } catch {
        if (isMounted) {
          setUser(null)
          removeToken()
          removeStoredUser()
          setAuthStatus('unauthenticated')
        }
      }
    }

    verifyInitialSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u: User = {
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        }
        setUser(u)
        setStoredUser({ id: session.user.id, name: u.name, email: u.email })
        setToken(session.access_token)
        setAuthStatus('authenticated')
        setAuthError(null)

        // If newly verified via email link or freshly signed in with credentials
        const hadVerificationInUrl = typeof window !== 'undefined' && (
          window.location.hash.includes('access_token') ||
          window.location.search.includes('code=') ||
          window.location.hash.includes('type=signup')
        )

        if (hadVerificationInUrl) {
          if (typeof window !== 'undefined' && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
          setAuthNotice('Email verified successfully! Welcome to your TruthLens AI workspace.')
          setPage('dashboard')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        removeToken()
        removeStoredUser()
        setAuthStatus('unauthenticated')
        setPage(prev => PROTECTED_PAGES.includes(prev) ? 'landing' : prev)
      } else if (event === 'INITIAL_SESSION' && !session) {
        setAuthStatus('unauthenticated')
      }
    })

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // Enforce route protection when session check completes
  useEffect(() => {
    if (authStatus === 'unauthenticated' && !user && PROTECTED_PAGES.includes(page)) {
      setAuthError('Please sign in to access your protected workspace.')
      setPage('login')
    }
  }, [authStatus, user, page])

  const navigate = (p: Page) => {
    // Route guard: intercept attempts to access protected pages without auth
    if (PROTECTED_PAGES.includes(p)) {
      if (authStatus === 'unauthenticated' || (!user && authStatus !== 'loading')) {
        setAuthError('Please sign in to access your protected workspace.')
        setPage('login')
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
        return
      }
    }

    if (sharedId) {
      setSharedId(null)
      window.history.pushState({}, '', window.location.pathname.replace(/\/shared.*$/, '/') || '/')
    }
    if (p === 'real-articles') {
      window.history.pushState({}, '', '/real-articles')
    }
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  const handleLogin = (u: User) => {
    setAuthError(null)
    setAuthNotice(null)
    setUser(u)
    setAuthStatus('authenticated')
    setPage('dashboard')
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  const handleLogout = async () => {
    await api.logout()
    setUser(null)
    setAuthStatus('unauthenticated')
    setAuthNotice('You have been signed out.')
    setAuthError(null)
    navigate('landing')
  }

  // Shared Result route (publicly viewable by direct link)
  if (sharedId) {
    return (
      <SharedResultPage
        shareId={sharedId}
        onNavigateHome={() => {
          setSharedId(null)
          window.history.pushState({}, '', window.location.pathname.replace(/\/shared.*$/, '/') || '/')
          setPage('analyzer')
        }}
      />
    )
  }

  // If initial requested route was protected and auth is still verifying, show clean loader
  if (authStatus === 'loading' && PROTECTED_PAGES.includes(page)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
        <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Verifying security credentials...</p>
      </div>
    )
  }

  // Active view routing
  if (DASH_PAGES.includes(page)) {
    // If a protected page is attempted without login, render Login immediately
    if (PROTECTED_PAGES.includes(page) && !user) {
      return (
        <div className="min-h-screen bg-background">
          <Wrap id="login">
            <AuthPage
              mode="login"
              navigate={navigate}
              onLogin={handleLogin}
              initialNotice={authNotice}
              initialError={authError || 'Please sign in to access your protected workspace.'}
            />
          </Wrap>
        </div>
      )
    }

    return (
      <DashboardLayout
        page={page === 'real-article-detail' ? 'real-articles' : page}
        user={user}
        navigate={navigate}
        onLogout={handleLogout}
      >
        <Wrap id={page}>
          {page === 'dashboard'           && <Dashboard navigate={navigate} user={user} />}
          {page === 'analyzer'            && <NewsAnalyzer navigate={navigate} />}
          {page === 'analytics'           && <Dashboard navigate={navigate} user={user} />}
          {page === 'history'             && <AnalysisHistory navigate={navigate} initialFilter="all" />}
          {page === 'real-articles'       && (
            <RealArticles
              navigate={navigate}
              onSelectArticle={(id) => {
                setSelectedRealArticleId(id)
                window.history.pushState({}, '', `/real-articles/${id}`)
                setPage('real-article-detail')
              }}
            />
          )}
          {page === 'real-article-detail' && selectedRealArticleId && (
            <RealArticleDetail
              articleId={selectedRealArticleId}
              navigate={navigate}
              onBack={() => {
                window.history.pushState({}, '', '/real-articles')
                setPage('real-articles')
              }}
            />
          )}
          {page === 'saved'               && <AnalysisHistory navigate={navigate} initialFilter="saved" />}
          {page === 'settings'            && <Profile navigate={navigate} user={user} initialSection="security" />}
          {page === 'profile'             && <Profile navigate={navigate} user={user} initialSection="account" />}
          {page === 'how-it-works'        && <HowItWorks navigate={navigate} />}
        </Wrap>
      </DashboardLayout>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Wrap id={page}>
        {page === 'landing'                    && <Landing navigate={navigate} />}
        {(page === 'login' || page === 'signup') && (
          <AuthPage
            mode={page}
            navigate={navigate}
            onLogin={handleLogin}
            initialNotice={authNotice}
            initialError={authError}
          />
        )}
      </Wrap>
    </div>
  )
}

