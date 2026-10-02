import { supabase } from './supabase'

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
  }
  // If in production without explicit VITE_API_URL, use relative '/api' for same-origin Vercel deployment
  if (import.meta.env.PROD) {
    return '/api'
  }
  // Local development fallback
  return 'http://127.0.0.1:8000/api'
}

const API_BASE_URL = getApiBaseUrl()


export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  created_at?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

export interface SignupResult {
  session: any | null
  user: UserProfile
  needsEmailVerification: boolean
  message: string
}

export interface MetricItem {
  label: string
  val: number
}

export interface EvidenceItem {
  source_name: string
  title?: string
  date?: string
  summary: string
  url?: string
  rating?: string
  claim?: string
  claimant?: string
  language?: string
  publisher?: string
  is_live_api?: boolean
}

export interface ClaimItem {
  claim_number: number
  claim: string
  status: 'supported' | 'contradicted' | 'needs_verification'
  explanation: string
  evidence?: EvidenceItem[]
  verified_information?: string
}

export interface ExplanationBreakdown {
  final_reasoning: string
  factcheck_evidence: string
  linguistic_signals: string
}

export interface AnalysisResult {
  id?: number
  input_type?: string
  source_url?: string
  raw_content?: string
  verdict: 'fake' | 'real' | 'uncertain'
  conf: number
  title?: string
  summary: string
  claims: string[]
  detailed_claims?: ClaimItem[]
  metrics: MetricItem[]
  metadata?: Record<string, any>
  explanation_breakdown?: ExplanationBreakdown
  is_bookmarked?: boolean
  created_at?: string
}

export interface HistoryItem {
  id: number
  title?: string
  snippet: string
  input_type: string
  verdict: 'fake' | 'real' | 'uncertain'
  confidence: number
  summary: string
  claims: string[]
  detailed_claims?: ClaimItem[]
  metrics: MetricItem[]
  is_bookmarked: boolean
  created_at: string
}

export interface DashboardStatsData {
  total_scans: number
  real_count: number
  fake_count: number
  uncertain_count: number
  real_articles_count?: number
  avg_confidence: number
  accuracy_rate: number
}

export interface RealArticleItem {
  id: number
  analysis_id?: number
  input_type: string
  original_title: string
  original_claim: string
  original_verdict: 'fake' | 'uncertain'
  confidence: number
  what_was_wrong: string
  what_actually_happened: string
  verified_source_name: string
  verified_source_url?: string
  sources?: EvidenceItem[]
  claims_breakdown?: ClaimItem[]
  created_at: string
}



// In-memory token cache for synchronous, race-free authorization access
let inMemoryToken: string | null = null

// Token & User storage helpers
export const getToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken
  try {
    const sessionStr = localStorage.getItem('truthlens_supabase_session')
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr)
      if (parsed?.access_token) {
        inMemoryToken = parsed.access_token
        return inMemoryToken
      }
    }
  } catch {}
  const raw = localStorage.getItem('truthlens_token')
  if (raw) inMemoryToken = raw
  return inMemoryToken
}

export const setToken = (token: string | null) => {
  inMemoryToken = token
  if (token) {
    localStorage.setItem('truthlens_token', token)
  } else {
    localStorage.removeItem('truthlens_token')
    localStorage.removeItem('truthlens_supabase_session')
  }
}

export const removeToken = () => {
  inMemoryToken = null
  localStorage.removeItem('truthlens_token')
  localStorage.removeItem('truthlens_supabase_session')
}

export const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('truthlens_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export const setStoredUser = (user: UserProfile) => localStorage.setItem('truthlens_user', JSON.stringify(user))
export const removeStoredUser = () => localStorage.removeItem('truthlens_user')

const getHeaders = (isJson: boolean = true) => {
  const headers: Record<string, string> = {}
  if (isJson) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// API methods
export const api = {
  // Auth via Supabase
  async signup(name: string, email: string, password: string): Promise<SignupResult> {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: cleanName },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined
      }
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        throw new Error('An account with this email address already exists. Please sign in instead.')
      }
      throw new Error(error.message || 'Registration failed. Please try again.')
    }

    const userProfile: UserProfile = {
      id: data.user?.id || '',
      name: data.user?.user_metadata?.name || cleanName,
      email: data.user?.email || cleanEmail,
    }

    // When Supabase email confirmation is enabled, data.session is null and data.user.email_confirmed_at is null.
    // If confirmation is disabled, data.session contains an active session.
    const hasSession = Boolean(data.session && data.session.access_token)
    const isEmailConfirmed = Boolean(data.user?.email_confirmed_at)
    const needsEmailVerification = !hasSession || !isEmailConfirmed

    if (!needsEmailVerification && hasSession) {
      setToken(data.session!.access_token)
      setStoredUser(userProfile)
    } else {
      // Guarantee no unverified session is persisted
      removeToken()
      removeStoredUser()
      try {
        localStorage.removeItem('truthlens_supabase_session')
      } catch {}
    }

    return {
      session: hasSession && !needsEmailVerification ? data.session : null,
      user: userProfile,
      needsEmailVerification,
      message: needsEmailVerification
        ? "We've sent a verification link to your email address."
        : 'Account created and verified successfully.'
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      const isUnconfirmed =
        msg.includes('email not confirmed') ||
        msg.includes('not confirmed') ||
        (error as any).code === 'email_not_confirmed'

      if (isUnconfirmed) {
        const err: any = new Error('Email verification required. Please verify your email to access your workspace.')
        err.needsEmailVerification = true
        err.email = cleanEmail
        throw err
      }

      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials or create a free account.')
      }

      throw new Error(error.message || 'Authentication failed. Please verify your credentials.')
    }

    if (!data.session?.access_token) {
      const err: any = new Error('Email verification required. Please verify your email to access your workspace.')
      err.needsEmailVerification = true
      err.email = cleanEmail
      throw err
    }

    const userProfile: UserProfile = {
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
      email: data.user.email || cleanEmail,
    }

    setToken(data.session.access_token)
    setStoredUser(userProfile)

    // Pre-verify backend recognition of the newly authenticated Supabase JWT
    try {
      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json'
        },
      })
      if (meRes.ok) {
        const meData = await meRes.json()
        if (meData?.name) userProfile.name = meData.name
        if (meData?.id) userProfile.id = meData.id
        if (meData?.avatar) userProfile.avatar = meData.avatar
        setStoredUser(userProfile)
      }
    } catch (e) {
      console.warn('[TruthLens] /api/auth/me bootstrap verification notice:', e)
    }

    return {
      access_token: data.session.access_token,
      token_type: 'bearer',
      user: userProfile
    }
  },

  async resendVerification(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      throw new Error('Please enter a valid email address.')
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined
      }
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('seconds')) {
        throw new Error('Please wait 60 seconds before requesting another verification email.')
      }
      throw new Error(error.message || 'Failed to resend verification link.')
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('[TruthLens] SignOut error:', e)
    }
    removeToken()
    removeStoredUser()
    try {
      localStorage.removeItem('truthlens_supabase_session')
      sessionStorage.clear()
    } catch {}
  },

  async getMe(): Promise<UserProfile | null> {
    const token = getToken()
    if (!token) return null
    try {
      // 1. Fetch user from active Supabase session
      const { data } = await supabase.auth.getUser()
      let userProfile: UserProfile | null = null
      if (data?.user) {
        userProfile = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
        }
      }

      // 2. Also verify and synchronize with backend /api/auth/me
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getHeaders(),
      })
      if (res.ok) {
        const backendUser = await res.json()
        const merged: UserProfile = {
          id: backendUser.id || userProfile?.id || '',
          name: backendUser.name || userProfile?.name || 'User',
          email: backendUser.email || userProfile?.email || '',
          avatar: backendUser.avatar || userProfile?.avatar
        }
        setStoredUser(merged)
        return merged
      } else if (res.status === 401) {
        // Token was rejected by backend
        removeToken()
        removeStoredUser()
        return null
      }

      if (userProfile) {
        setStoredUser(userProfile)
        return userProfile
      }
      return null
    } catch {
      return getStoredUser()
    }
  },


  // News Analysis
  async analyzeTextOrUrl(params: { mode: 'text' | 'url'; content?: string; url?: string; title?: string }): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }))
      throw new Error(err.detail || 'Analysis failed')
    }
    return await res.json()
  },

  async analyzeFile(file: File): Promise<AnalysisResult> {
    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_BASE_URL}/analyze/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'File upload analysis failed' }))
      throw new Error(err.detail || 'File analysis failed')
    }
    return await res.json()
  },

  async getAnalysisById(id: number | string): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE_URL}/analyze/${id}`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis not found' }))
      throw new Error(err.detail || 'Analysis not found')
    }
    return await res.json()
  },

  async getHistory(params?: { search?: string; verdict?: string; bookmarked?: boolean }): Promise<HistoryItem[]> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.append('search', params.search)
      if (params?.verdict && params.verdict !== 'all') searchParams.append('verdict', params.verdict)
      if (params?.bookmarked !== undefined) searchParams.append('bookmarked', String(params.bookmarked))

      const res = await fetch(`${API_BASE_URL}/history?${searchParams.toString()}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  async deleteHistory(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/history/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  },

  async toggleBookmark(id: number): Promise<{ id: number; is_bookmarked: boolean }> {
    const res = await fetch(`${API_BASE_URL}/history/${id}/bookmark`, {
      method: 'PATCH',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to toggle bookmark')
    return await res.json()
  },

  async getDashboardStats(): Promise<DashboardStatsData> {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch stats')
    return await res.json()
  },

  async getRealArticles(params?: { search?: string; verdict?: string }): Promise<RealArticleItem[]> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.search) searchParams.append('search', params.search)
      if (params?.verdict && params.verdict !== 'all') searchParams.append('verdict', params.verdict)

      const res = await fetch(`${API_BASE_URL}/real-articles?${searchParams.toString()}`, {
        headers: getHeaders(),
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  },

  async getRealArticleById(id: number | string): Promise<RealArticleItem> {
    const res = await fetch(`${API_BASE_URL}/real-articles/${id}`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Real Article not found' }))
      throw new Error(err.detail || 'Real Article not found')
    }
    return await res.json()
  }
}

