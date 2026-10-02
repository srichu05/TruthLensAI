import { useState, useEffect } from 'react'
import { api, AnalysisResult, ClaimItem } from '../services/api'
import { generateAnalysisPDF } from '../utils/pdfGenerator'
import { useTheme } from '../utils/theme'
import {
  ShieldIcon, AlertTriangle, CheckCircleIcon, InfoIcon,
  DownloadIcon, ShareIcon, ZapIcon, CheckIcon, CopyIcon, ArrowRightIcon,
  ChevronDownIcon, ChevronRightIcon, SunIcon, MoonIcon
} from '../components/Icons'

interface Props {
  shareId: string | number
  onNavigateHome: () => void
}

const VERDICT_CONFIG = {
  fake: {
    verdictText: 'FAKE NEWS',
    color: '#EF4444',
    bgClass: 'bg-fake-bg',
    borderClass: 'border-fake-border',
    textClass: 'text-fake',
    icon: AlertTriangle,
    ringStroke: '#EF4444',
    ringBg: 'rgba(239, 68, 68, 0.15)',
    badgeBg: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900',
  },
  real: {
    verdictText: 'TRUE / REAL NEWS',
    color: '#10B981',
    bgClass: 'bg-real-bg',
    borderClass: 'border-real-border',
    textClass: 'text-real',
    icon: CheckCircleIcon,
    ringStroke: '#10B981',
    ringBg: 'rgba(16, 185, 129, 0.15)',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900',
  },
  uncertain: {
    verdictText: 'FAKE NEWS',
    color: '#EF4444',
    bgClass: 'bg-fake-bg',
    borderClass: 'border-fake-border',
    textClass: 'text-fake',
    icon: AlertTriangle,
    ringStroke: '#EF4444',
    ringBg: 'rgba(239, 68, 68, 0.15)',
    badgeBg: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900',
  },
}


function CircularConfidence({ value, color, bgColor }: { value: number; color: string; bgColor: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width="130" height="130" viewBox="0 0 120 120" className="drop-shadow-sm">
      <circle cx="60" cy="60" r={r} fill="none" stroke={bgColor} strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="60" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="Google Sans, sans-serif">
        {value}%
      </text>
      <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="Inter, sans-serif">
        CONFIDENCE
      </text>
    </svg>
  )
}

export default function SharedResultPage({ shareId, onNavigateHome }: Props) {
  const { resolvedTheme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [expandedClaims, setExpandedClaims] = useState<Record<number, boolean>>({})

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    let isMounted = true
    async function fetchResult() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getAnalysisById(shareId)
        if (isMounted) {
          setResult(data)
          setLoading(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Analysis result is unavailable.')
          setLoading(false)
        }
      }
    }
    fetchResult()
    return () => {
      isMounted = false
    }
  }, [shareId])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const toggleClaimExpansion = (claimIdx: number) => {
    setExpandedClaims(prev => ({
      ...prev,
      [claimIdx]: !prev[claimIdx]
    }))
  }

  const handleDownloadReport = () => {
    if (!result) return
    setDownloading(true)
    try {
      generateAnalysisPDF({
        result,
        inputType: result.input_type || 'Text',
        source: result.source_url || result.title || 'Shared Analysis',
        analysisDate: result.created_at,
      })
    } catch {
      showToast('Unable to generate the report. Please try again.')
    } finally {
      setTimeout(() => setDownloading(false), 500)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      showToast('Result link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast('Share link created. Copy it from the browser address bar.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-bold text-foreground font-display mb-1">Loading Shared Analysis...</h2>
        <p className="text-xs text-muted-foreground">Retrieving verified report data from TruthLens AI</p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground font-display mb-2">Analysis Result Unavailable</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {error || 'The requested analysis result could not be found or has expired.'}
        </p>
        <button
          onClick={onNavigateHome}
          className="bg-primary text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 text-sm shadow-sm"
        >
          <ZapIcon size={16} /> Analyze News on TruthLens AI
        </button>
      </div>
    )
  }

  const verdict = result.verdict || 'uncertain'
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.uncertain
  const ResIcon = config.icon
  const confValue = result.conf || 80
  const displaySummary = result.summary || 'No summary available for this analysis.'
  const displayMetrics = result.metrics || []
  const detailedClaims: ClaimItem[] = result.detailed_claims || []
  const formattedDate = result.created_at
    ? new Date(result.created_at).toLocaleString()
    : 'Recently Analyzed'
  const sourceInfo = result.source_url || result.title || 'Submitted news content'

  const supportedCount = detailedClaims.filter(c => c.status === 'supported').length
  const contradictedCount = detailedClaims.filter(c => c.status === 'contradicted').length
  const unverifiedCount = detailedClaims.filter(c => c.status === 'needs_verification').length
  const totalClaimsCount = detailedClaims.length

  let verifiedSectionHeading = "What's Actually Supported?"
  let verifiedSectionSub = "Here is what the available evidence indicates about the claims in this content."
  if (verdict === 'real') {
    verifiedSectionHeading = "Claims Supported by Available Evidence"
    verifiedSectionSub = "Contextual evidence and corroboration for the key assertions in this article."
  } else if (verdict === 'uncertain') {
    verifiedSectionHeading = "What Could Not Be Verified"
    verifiedSectionSub = "Analysis of ambiguous claims requiring independent secondary corroboration."
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900/90 text-emerald-300 border border-emerald-500/50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-mono font-medium animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl">
          <CheckIcon size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-white shadow-md shadow-primary/20">
              <ShieldIcon size={20} />
            </div>
            <div>
              <span className="font-black font-display text-lg tracking-tight text-foreground">TRUTHLENS</span>
              <span className="text-[10px] font-mono font-bold text-primary ml-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">INTELLIGENCE</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground bg-secondary/70 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> VERIFIED DOSSIER PERMALINK
            </span>
            <button
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              className="p-2 rounded-xl border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary transition-all"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? <SunIcon size={15} className="text-amber-400" /> : <MoonIcon size={15} className="text-primary" />}
            </button>
            <button
              onClick={onNavigateHome}
              className="bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              Execute New Query <ArrowRightIcon size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        {/* Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">TruthLens AI Telemetry Archive</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display text-foreground tracking-tight">
              News Credibility & Evidence Ledger
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="flex items-center gap-2 border border-border bg-card/60 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-secondary transition-all"
            >
              <DownloadIcon size={14} />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 border border-border bg-card/60 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-secondary transition-all"
            >
              {copied ? <CheckIcon size={14} className="text-real" /> : <ShareIcon size={14} />}
              {copied ? 'Link Copied' : 'Share Dossier'}
            </button>
          </div>
        </div>

        {/* Source and Metadata Card */}
        <div className="bg-card/80 border border-border rounded-xl p-5 mb-6 grid sm:grid-cols-3 gap-4 text-xs font-mono backdrop-blur-xl shadow-xs">
          <div>
            <span className="font-bold text-muted-foreground uppercase block mb-1">TARGET SOURCE</span>
            <span className="text-foreground font-semibold break-all">{sourceInfo}</span>
          </div>
          <div>
            <span className="font-bold text-muted-foreground uppercase block mb-1">INGESTION VECTOR</span>
            <span className="text-foreground font-semibold uppercase">{result.input_type || 'Text'}</span>
          </div>
          <div>
            <span className="font-bold text-muted-foreground uppercase block mb-1">AUDIT TIMESTAMP</span>
            <span className="text-foreground font-semibold">{formattedDate}</span>
          </div>
        </div>

        {/* 1. Verdict & Metrics Breakdown */}
        <div className="grid md:grid-cols-3 gap-5 mb-6">
          {/* Main Verdict Card */}
          <div className={`md:col-span-1 ${config.bgClass} border ${config.borderClass} rounded-2xl p-6 flex flex-col items-center text-center justify-between backdrop-blur-xl relative overflow-hidden shadow-lg`}>
            <div className="w-12 h-12 rounded-xl bg-card/80 border border-border flex items-center justify-center mb-3 shadow-md">
              <ResIcon size={24} className={config.textClass} />
            </div>
            <p className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Algorithmic Verdict</p>
            <p className={`text-2xl font-black font-display mb-4 ${config.textClass}`}>{config.verdictText}</p>
            <div className="py-2">
              <CircularConfidence value={confValue} color={config.color} bgColor={config.ringBg} />
            </div>
          </div>

          {/* Content Analysis Metrics */}
          <div className="md:col-span-2 bg-card/80 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-xl flex flex-col justify-between">
            <h3 className="font-bold text-foreground font-display mb-4 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Content Analysis Metrics
            </h3>
            {displayMetrics.length > 0 ? (
              <div className="space-y-3.5">
                {displayMetrics.map(({ label, val }) => {
                  const barColor =
                    val > 65
                      ? verdict === 'real'
                        ? 'bg-real'
                        : 'bg-fake'
                      : val > 45
                      ? 'bg-uncertain'
                      : verdict === 'real'
                      ? 'bg-real'
                      : 'bg-secondary'
                  return (
                    <div key={label} className="bg-background/40 p-3 rounded-xl border border-border/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-foreground font-medium">{label}</span>
                        <span className="text-xs font-bold font-mono text-foreground">{val}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">Standard credibility signals verified.</p>
            )}
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="bg-card/80 border border-border rounded-2xl p-6 mb-8 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ZapIcon size={16} className="text-primary" />
            </div>
            <h3 className="font-bold text-foreground font-display text-sm">Automated Evidence Synthesis</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bg-background/50 p-4 rounded-xl border border-border/60">
            {displaySummary}
          </p>
        </div>

        {/* 2. SIMPLIFIED CLAIM-BY-CLAIM SECTIONS */}
        <div className="space-y-8 mb-8">
          {/* TRUE CLAIMS SECTION */}
          <div className="bg-card/80 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-real-bg text-real border border-real-border flex items-center justify-center">
                  <CheckCircleIcon size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                    True / Real Claims
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Statements supported by reliable evidence or verified sources ({detailedClaims.filter(c => c.status === 'true' || c.status === 'supported').length})
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-real/15 text-real border border-real/30 px-3 py-1 rounded-full">
                {detailedClaims.filter(c => c.status === 'true' || c.status === 'supported').length} TRUE
              </span>
            </div>

            {detailedClaims.filter(c => c.status === 'true' || c.status === 'supported').length === 0 ? (
              <div className="bg-background/50 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground font-mono">
                No factual claims in this article were verified as supported by reliable evidence.
              </div>
            ) : (
              <div className="space-y-4">
                {detailedClaims.filter(c => c.status === 'true' || c.status === 'supported').map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-background/70 border border-real-border/40 hover:border-real/60 rounded-2xl p-5 shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="text-[11px] font-bold font-mono tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-real" /> CLAIM {String(item.claim_number || idx + 1).padStart(2, '0')}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-real-bg text-real border border-real-border px-3 py-0.5 rounded-full text-[11px] font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-real" /> TRUE CLAIM
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-foreground leading-relaxed mb-3 bg-secondary/30 p-3.5 rounded-xl border border-border/50">
                      "{item.claim}"
                    </p>

                    <div className="bg-real/5 rounded-xl p-3 border border-real/20 mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-real font-mono mb-1">Why It Is True</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>

                    {item.evidence && item.evidence.length > 0 && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                        <span className="text-muted-foreground">
                          Evidence: <strong className="text-foreground">{item.evidence[0].source_name}</strong>
                        </span>
                        {item.evidence[0].url ? (
                          <a
                            href={item.evidence[0].url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-real font-bold hover:underline"
                          >
                            Verified Source <ArrowRightIcon size={12} />
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Primary Record</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAKE CLAIMS SECTION */}
          <div className="bg-card/80 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-fake-bg text-fake border border-fake-border flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                    Fake / Contradicted Claims
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Statements that are false, fabricated, misleading, or contradicted by evidence ({detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification').length})
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-fake/15 text-fake border border-fake/30 px-3 py-1 rounded-full">
                {detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification').length} FAKE
              </span>
            </div>

            {detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification').length === 0 ? (
              <div className="bg-background/50 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground font-mono">
                No false or contradicted claims were identified in this article.
              </div>
            ) : (
              <div className="space-y-4">
                {detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification').map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-background/70 border border-fake-border/40 hover:border-fake/60 rounded-2xl p-5 shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="text-[11px] font-bold font-mono tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-fake" /> CLAIM {String(item.claim_number || idx + 1).padStart(2, '0')}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-fake-bg text-fake border border-fake-border px-3 py-0.5 rounded-full text-[11px] font-bold font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-fake" /> FAKE CLAIM
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-foreground leading-relaxed mb-3 bg-secondary/30 p-3.5 rounded-xl border border-border/50">
                      "{item.claim}"
                    </p>

                    <div className="bg-fake/5 rounded-xl p-3 border border-fake/20 mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-fake font-mono mb-1">Why It Is Fake / Misleading</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>

                    {item.evidence && item.evidence.length > 0 && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                        <span className="text-muted-foreground">
                          Contradictory Evidence: <strong className="text-foreground">{item.evidence[0].source_name}</strong>
                        </span>
                        {item.evidence[0].url ? (
                          <a
                            href={item.evidence[0].url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-fake font-bold hover:underline"
                          >
                            Fact-Check Record <ArrowRightIcon size={12} />
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Scientific Registry</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* 3. VERIFIED INFORMATION SECTION */}
        <div className="bg-card/80 border border-border rounded-2xl p-6 mb-8 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <ShieldIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">
                {verifiedSectionHeading}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {verifiedSectionSub}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {detailedClaims.length > 0 ? (
              detailedClaims.map((item, i) => (
                <div key={i} className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className="text-xs mt-0.5 font-bold">
                      {item.status === 'supported' ? '✓' : item.status === 'contradicted' ? '❌' : '🟡'}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">Indexed Claim: </span>
                      <span className="text-xs text-foreground italic">"{item.claim}"</span>
                    </div>
                  </div>

                  <div className="ml-6 pl-3 border-l-2 border-primary/40 space-y-2 mt-2">
                    <p className="text-xs font-semibold text-primary font-mono">Verified Synthesis:</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.verified_information || item.explanation}
                    </p>

                    {item.evidence && item.evidence[0] && (
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                        <span className="text-muted-foreground">
                          Primary Source: <strong className="text-foreground">{item.evidence[0].source_name}</strong>
                        </span>
                        {item.evidence[0].url && (
                          <a
                            href={item.evidence[0].url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            [Inspect URL]
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                Available evidence is insufficient to establish specific verified claims.
              </p>
            )}
          </div>
        </div>

        {/* 4. AI Transparency Disclaimer Box */}
        <div className="bg-card/50 border border-border/80 rounded-xl p-4 mb-8 flex items-start gap-3 text-xs text-muted-foreground backdrop-blur-md">
          <InfoIcon size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-mono text-[11px]">
            Operational Intelligence Note: Verification assertions are synthesized through multi-source NLP heuristics and real-time knowledge matching. Unverified claims indicate a lack of unambiguous corroboration in primary institutional channels.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground bg-card/40 font-mono">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} TruthLens AI Forensic Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateHome} className="hover:text-foreground transition-colors font-bold text-primary">
              Launch Intelligence Terminal
            </button>
            <span>·</span>
            <span>Immutable Shared Dossier</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

