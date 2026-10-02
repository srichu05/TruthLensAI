import { useState, useRef } from 'react'
import { Page } from '../App'
import {
  ZapIcon, LinkIcon, UploadIcon, CheckIcon, CheckCircleIcon,
  AlertTriangle, InfoIcon, BookmarkIcon, DownloadIcon, ShareIcon, RefreshIcon, ArrowRightIcon,
  CopyIcon, XIcon, ChevronDownIcon, ChevronRightIcon, ShieldIcon, NewspaperIcon
} from '../components/Icons'

import { api, AnalysisResult, ClaimItem } from '../services/api'
import { generateAnalysisPDF } from '../utils/pdfGenerator'

interface Props { navigate: (page: Page) => void }

type Mode    = 'text' | 'url' | 'file'
type State   = 'input' | 'analyzing' | 'result'
type Verdict = 'fake' | 'real'

const STEPS = [
  '01 — Validate input',
  '02 — Extract full article text',
  '03 — Identify factual statements',
  '04 — Retrieve reliable evidence',
  '05 — Evaluate credibility & threshold (60%)',
  '06 — Prepare verification summary',
]

const VERDICT_CONFIG = {
  fake: {
    verdictText: 'FAKE NEWS',
    subText: 'Score below 60% — Contradicted or unsubstantiated factual statements detected.',
    color: '#EF4444',
    bgClass: 'bg-fake-bg',
    borderClass: 'border-fake-border',
    textClass: 'text-fake',
    icon: AlertTriangle,
    ringStroke: '#EF4444',
    ringBg: 'rgba(239, 68, 68, 0.15)',
  },
  real: {
    verdictText: 'TRUE / REAL NEWS',
    subText: 'Score 60% or higher — Factual assertions confirmed by reliable evidence.',
    color: '#10B981',
    bgClass: 'bg-real-bg',
    borderClass: 'border-real-border',
    textClass: 'text-real',
    icon: CheckCircleIcon,
    ringStroke: '#10B981',
    ringBg: 'rgba(16, 185, 129, 0.15)',
  },
}

const EXPLANATIONS = [
  { key: 'fake', label: 'Suspicious Language',  desc: 'Specific patterns and deceptive rhetoric evaluated against known misinformation signatures.' },
  { key: 'real', label: 'Factual Attribution',  desc: 'Primary assertions verified against accredited domain repositories and registries.' },
  { key: 'fake', label: 'Sensationalism Score', desc: 'Overstated claims and emotionally charged phrasing detected in core text.' },
  { key: 'real', label: 'Source Reliability',   desc: 'Named institutional citations and primary agencies cross-referenced with wire records.' },
  { key: 'real', label: 'Logical Coherence',    desc: 'Internal consistency and empirical feasibility of stated assertions.' },
]

function CircularConfidence({ value, color, bgColor }: { value: number; color: string; bgColor: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width="140" height="140" viewBox="0 0 120 120" className="drop-shadow-sm">
      <circle cx="60" cy="60" r={r} fill="none" stroke={bgColor} strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="60" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="Google Sans, sans-serif">
        {value}%
      </text>
      <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#94A3B8" fontFamily="Inter, sans-serif">
        SCORE
      </text>
    </svg>
  )
}

// ── Graph 1: Clean 2-Category Claim Breakdown Donut Chart ────────
function ClaimVerificationBreakdown({ detailedClaims }: { detailedClaims: ClaimItem[] }) {
  const [hovered, setHovered] = useState<'true' | 'fake' | null>(null)

  const total = detailedClaims.length
  const trueCount = detailedClaims.filter(c => c.status === 'true' || c.status === 'supported').length
  const fakeCount = detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification').length

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[270px]">
        <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <InfoIcon size={20} />
        </div>
        <h3 className="text-sm font-bold font-display text-foreground mb-1">Claim Verification Breakdown</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          No factual statements analyzed yet.
        </p>
      </div>
    )
  }

  const truePct = Math.round((trueCount / total) * 100)
  const fakePct = Math.max(0, 100 - truePct)

  const r = 44
  const circ = 2 * Math.PI * r

  const trueDash = (trueCount / total) * circ
  const fakeDash = (fakeCount / total) * circ

  let centerLabel = 'TOTAL CLAIMS'
  let centerValue = `${total}`
  let centerSub = 'Meaningful statements'
  let centerColor = 'var(--foreground)'

  if (hovered === 'true') {
    centerLabel = 'TRUE CLAIMS'
    centerValue = `${trueCount} (${truePct}%)`
    centerSub = `${trueCount} of ${total} verified`
    centerColor = 'var(--real)'
  } else if (hovered === 'fake') {
    centerLabel = 'FAKE CLAIMS'
    centerValue = `${fakeCount} (${fakePct}%)`
    centerSub = `${fakeCount} of ${total} refuted`
    centerColor = 'var(--fake)'
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-foreground font-display text-sm">
            Factual Statements Breakdown
          </h3>
          <p className="text-xs text-muted-foreground">
            Distribution of TRUE vs. FAKE claims
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-lg">
          {total} Statements
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-1">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg width="136" height="136" viewBox="0 0 110 110" className="drop-shadow-xs">
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="10" opacity="0.3" />

            {/* True Claims */}
            {trueCount > 0 && (
              <circle
                cx="55" cy="55" r={r} fill="none" stroke="var(--real)"
                strokeWidth={hovered === 'true' ? 14 : 10}
                strokeDasharray={`${trueDash} ${circ}`}
                strokeDashoffset={0}
                strokeLinecap={fakeCount === 0 ? 'round' : 'butt'}
                transform="rotate(-90 55 55)"
                className="cursor-pointer transition-all duration-300"
                style={{ opacity: hovered && hovered !== 'true' ? 0.45 : 1 }}
                onMouseEnter={() => setHovered('true')}
                onMouseLeave={() => setHovered(null)}
              />
            )}

            {/* Fake Claims */}
            {fakeCount > 0 && (
              <circle
                cx="55" cy="55" r={r} fill="none" stroke="var(--fake)"
                strokeWidth={hovered === 'fake' ? 14 : 10}
                strokeDasharray={`${fakeDash} ${circ}`}
                strokeDashoffset={-trueDash}
                strokeLinecap={trueCount === 0 ? 'round' : 'butt'}
                transform="rotate(-90 55 55)"
                className="cursor-pointer transition-all duration-300"
                style={{ opacity: hovered && hovered !== 'fake' ? 0.45 : 1 }}
                onMouseEnter={() => setHovered('fake')}
                onMouseLeave={() => setHovered(null)}
              />
            )}
          </svg>

          {/* Interactive center display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground font-mono">
              {centerLabel}
            </span>
            <span
              className="text-sm font-black font-mono leading-tight transition-colors duration-200"
              style={{ color: centerColor }}
            >
              {centerValue}
            </span>
            <span className="text-[8px] text-muted-foreground">
              {centerSub}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2.5">
          {/* True / Real */}
          <div
            onMouseEnter={() => setHovered('true')}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
              hovered === 'true' ? 'bg-real/15 border border-real/30' : 'bg-secondary/40 hover:bg-secondary/80 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-real/20 text-real flex items-center justify-center text-xs font-bold font-mono">
                ✓
              </span>
              <span className="text-xs font-semibold text-foreground">True Claims</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-real">{trueCount}</span>
              <span className="text-[11px] text-muted-foreground">({truePct}%)</span>
            </div>
          </div>

          {/* Fake */}
          <div
            onMouseEnter={() => setHovered('fake')}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
              hovered === 'fake' ? 'bg-fake/15 border border-fake/30' : 'bg-secondary/40 hover:bg-secondary/80 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-fake/20 text-fake flex items-center justify-center text-xs font-bold font-mono">
                ✕
              </span>
              <span className="text-xs font-semibold text-foreground">Fake Claims</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-fake">{fakeCount}</span>
              <span className="text-[11px] text-muted-foreground">({fakePct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Graph 2: Source Corroboration Bar Chart ───────
function EvidenceCoverageChart({ detailedClaims }: { detailedClaims: ClaimItem[] }) {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)

  const total = detailedClaims.length

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[270px]">
        <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <ShieldIcon size={20} />
        </div>
        <h3 className="text-sm font-bold font-display text-foreground mb-1">Evidence Corroboration</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Evidence data will appear when statements are evaluated.
        </p>
      </div>
    )
  }

  const verifiedEvidenceCount = detailedClaims.filter(c => (c.evidence && c.evidence.length > 0) || c.status === 'true').length
  const unsubstantiatedCount = total - verifiedEvidenceCount

  const verPct = Math.round((verifiedEvidenceCount / total) * 100)
  const unverifiedPct = Math.max(0, 100 - verPct)

  const tiers = [
    {
      id: 'verified',
      label: 'Verified & Corroborated',
      desc: 'Corroborated by accredited registries, institutions, or verified facts',
      count: verifiedEvidenceCount,
      pct: verPct,
      barClass: 'bg-real',
      textClass: 'text-real',
      badgeClass: 'bg-real-bg text-real border-real-border',
    },
    {
      id: 'refuted',
      label: 'Refuted / Unsubstantiated',
      desc: 'Contradicted by evidence or lacking verified primary basis',
      count: unsubstantiatedCount,
      pct: unverifiedPct,
      barClass: 'bg-fake',
      textClass: 'text-fake',
      badgeClass: 'bg-fake-bg text-fake border-fake-border',
    },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-foreground font-display text-sm">
            Evidence Corroboration
          </h3>
          <p className="text-xs text-muted-foreground">
            Reliable source backing across analyzed statements
          </p>
        </div>
        <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
          AI Verified
        </span>
      </div>

      <div className="space-y-3.5 py-1">
        {tiers.map((tier) => {
          const isHovered = hoveredTier === tier.id
          return (
            <div
              key={tier.id}
              onMouseEnter={() => setHoveredTier(tier.id)}
              onMouseLeave={() => setHoveredTier(null)}
              className={`p-2.5 rounded-xl border transition-all ${
                isHovered
                  ? 'bg-secondary/70 border-primary/30 shadow-xs'
                  : 'bg-secondary/30 border-transparent hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${tier.barClass}`} />
                  <span className="text-xs font-semibold text-foreground">
                    {tier.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {tier.count} {tier.count === 1 ? 'statement' : 'statements'}
                  </span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border ${tier.badgeClass}`}>
                    {tier.pct}%
                  </span>
                </div>
              </div>

              <div className="h-2.5 bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
                <div
                  className={`h-full ${tier.barClass} rounded-full transition-all duration-1000 ease-out`}
                  style={{
                    width: `${tier.pct}%`,
                    minWidth: tier.count > 0 ? '6px' : '0px',
                  }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                {tier.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default function NewsAnalyzer({ navigate }: Props) {
  const [mode, setMode]               = useState<Mode>('text')
  const [text, setText]               = useState('')
  const [url, setUrl]                 = useState('')
  const [file, setFile]               = useState<File | null>(null)
  const [state, setState]             = useState<State>('input')
  const [step, setStep]               = useState(0)
  const [analysisResult, setAnalysis] = useState<AnalysisResult | null>(null)
  const [saved, setSaved]             = useState(false)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSharing, setIsSharing]         = useState(false)
  const [shareCopied, setShareCopied]     = useState(false)
  const [toast, setToast]                 = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareModalUrl, setShareModalUrl]   = useState('')
  const [expandedClaims, setExpandedClaims] = useState<Record<number, boolean>>({})
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const toggleClaimExpansion = (claimIdx: number) => {
    setExpandedClaims(prev => ({
      ...prev,
      [claimIdx]: !prev[claimIdx]
    }))
  }

  const charMax = 10000
  const charCount = text.length

  const handleDownloadReport = () => {
    if (!analysisResult) {
      showToast('Analysis result is unavailable.', 'error')
      return
    }
    setIsDownloading(true)
    try {
      const inputType =
        mode === 'file'
          ? (file?.name.split('.').pop()?.toUpperCase() || 'FILE')
          : mode === 'url'
          ? 'URL'
          : 'TEXT'
      const sourceRef =
        mode === 'url'
          ? url
          : mode === 'file' && file
          ? file.name
          : analysisResult.title || text.slice(0, 60)

      generateAnalysisPDF({
        result: analysisResult,
        inputType,
        source: sourceRef,
        analysisDate: analysisResult.created_at || new Date(),
      })
    } catch {
      showToast('Unable to generate the report. Please try again.', 'error')
    } finally {
      setTimeout(() => setIsDownloading(false), 500)
    }
  }

  const handleShareResult = async () => {
    if (!analysisResult) {
      showToast('Analysis result is unavailable.', 'error')
      return
    }

    setIsSharing(true)
    try {
      const id = analysisResult.id
      if (!id) {
        showToast('Unable to create a share link. Please try again.', 'error')
        setIsSharing(false)
        return
      }

      const base = window.location.origin
      const path = window.location.pathname.replace(/\/shared.*$/, '').replace(/\/$/, '')
      const shareUrl = `${base}${path}/shared/${id}`

      let copiedSuccessfully = false
      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl)
          copiedSuccessfully = true
        } catch {
          copiedSuccessfully = false
        }
      }

      if (!copiedSuccessfully) {
        try {
          const textArea = document.createElement('textarea')
          textArea.value = shareUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          copiedSuccessfully = document.execCommand('copy')
          document.body.removeChild(textArea)
        } catch {
          copiedSuccessfully = false
        }
      }

      if (copiedSuccessfully) {
        setShareCopied(true)
        showToast('Result link copied to clipboard!', 'success')
        setTimeout(() => setShareCopied(false), 2500)
      } else {
        setShareModalUrl(shareUrl)
        setShowShareModal(true)
        showToast('Share link created. Copy it from here:', 'info')
      }
    } catch {
      showToast('Unable to create a share link. Please try again.', 'error')
    } finally {
      setIsSharing(false)
    }
  }

  const analyze = async () => {
    if (mode === 'text' && charCount < 10) return
    if (mode === 'url' && !url.includes('.')) return
    if (mode === 'file' && !file) {
      fileInputRef.current?.click()
      return
    }

    setErrorMsg(null)
    setState('analyzing')
    setStep(0)
    setSaved(false)
    setExpandedClaims({})

    // Progress step animation
    const delays = [300, 700, 1200, 1800, 2200]
    delays.forEach((d, i) => setTimeout(() => setStep(i + 1), d))

    try {
      let res: AnalysisResult
      if (mode === 'file' && file) {
        res = await api.analyzeFile(file)
      } else {
        res = await api.analyzeTextOrUrl({
          mode: mode as 'text' | 'url',
          content: mode === 'text' ? text : undefined,
          url: mode === 'url' ? url : undefined,
        })
      }
      setTimeout(() => {
        setAnalysis(res)
        setState('result')
      }, 2500)
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis failed. Please check your backend connection.')
      setState('input')
    }
  }

  const handleSaveToggle = async () => {
    if (analysisResult?.id) {
      try {
        await api.toggleBookmark(analysisResult.id)
        setSaved(!saved)
      } catch {
        setSaved(true)
      }
    } else {
      setSaved(true)
    }
  }

  const rawVerdict = analysisResult?.verdict || 'real'
  const verdict = rawVerdict === 'real' ? 'real' : 'fake'
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.real
  const ResIcon = config.icon


  // ── Input ─────────────────────────────────────────────────────
  if (state === 'input') return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto page-fade space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              Claim Studio
            </span>
            <span className="text-xs text-muted-foreground font-mono">v2.4 Inference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight">
            Claim & News Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Multi-signal NLP pipeline with claim extraction, evidence matching, and explainability.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">Sample:</span>
          <button
            onClick={() => {
              setMode('text')
              setText('Scientists at Cambridge laboratory publish preliminary findings establishing that ambient temperature variations over 30 days correlate with cellular metabolic activity.')
            }}
            className="text-[11px] font-mono text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 px-2.5 py-1 rounded-lg transition-colors"
          >
            Real Sample
          </button>
          <button
            onClick={() => {
              setMode('text')
              setText('Secret leaked documents prove military satellite arrays are beaming mind control signals to alter public behavior worldwide without consent.')
            }}
            className="text-[11px] font-mono text-fake bg-fake-bg hover:bg-fake/20 border border-fake-border px-2.5 py-1 rounded-lg transition-colors"
          >
            Fake Sample
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden glow-card">
        {/* Tabs */}
        <div className="flex border-b border-border bg-sidebar-bg/60">
          {(['text', 'url', 'file'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                mode === m
                  ? 'text-primary border-b-2 border-primary bg-primary/10 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {m === 'text' && <ZapIcon size={14} />}
              {m === 'url'  && <LinkIcon size={14} />}
              {m === 'file' && <UploadIcon size={14} />}
              {m === 'text' ? 'Raw Text / Claim' : m === 'url' ? 'Article URL' : 'Document File'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {mode === 'text' && (
            <>
              <div className="relative">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, charMax))}
                  placeholder="Start your analysis: Enter a news claim, paste an article, or provide text to begin verification..."
                  rows={9}
                  className="w-full border border-border rounded-xl px-4 py-3.5 text-xs sm:text-sm text-foreground bg-background/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all leading-relaxed font-mono"
                />
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {charCount.toLocaleString()} / {charMax.toLocaleString()} chars
                  </span>
                  {charCount >= 10 && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Ready for analysis
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-36 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(charCount / charMax) * 100}%` }} />
                </div>
              </div>
            </>
          )}

          {mode === 'url' && (
            <div className="py-2">
              <label className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">
                Target Article URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://news-outlet.com/article/breaking-story"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-mono">
                TruthLens scraper extracts article body, verifies publication domain, and isolates verifiable assertions.
              </p>
            </div>
          )}

          {mode === 'file' && (
            <div
              className="border-2 border-dashed border-border rounded-2xl py-14 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer bg-background/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.md,.doc,.docx"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) setFile(e.target.files[0])
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-md">
                <UploadIcon size={26} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground mb-1">
                  {file ? file.name : 'Drag & drop document or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'Supports PDF, TXT, DOC up to 10 MB'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="border border-border bg-card px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold hover:bg-secondary transition-colors"
              >
                {file ? 'Change file' : 'Select Document'}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-500 font-mono font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/80 flex-wrap gap-3">
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed font-mono">
              ⚡ Multi-model inference running gradient boosting & transformer embeddings.
            </p>
            <button
              onClick={analyze}
              disabled={(mode === 'text' && charCount < 10) || (mode === 'url' && !url.includes('.')) || (mode === 'file' && !file)}
              className="flex items-center gap-2 bg-primary text-white px-7 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-xl shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed border border-primary/30"
            >
              <ZapIcon size={14} /> Execute Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Analyzing ─────────────────────────────────────────────────
  if (state === 'analyzing') return (
    <div className="p-8 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin mb-8" />
      <h2 className="text-2xl font-bold text-foreground font-display mb-8">Analyzing & Verifying Claims…</h2>
      <div className="w-full space-y-4">
        {STEPS.map((label, i) => {
          const done   = step > i
          const active = step === i
          return (
            <div key={label} className={`flex items-center gap-4 transition-all duration-300 ${done || active ? 'opacity-100' : 'opacity-25'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                done   ? 'bg-real text-white' :
                active ? 'bg-primary/10 border-2 border-primary' : 'border-2 border-border'
              }`}>
                {done   && <CheckIcon size={13} className="text-white" />}
                {active && <div className="w-2.5 h-2.5 rounded-full bg-primary pulse-dot" />}
              </div>
              <span className={`text-sm transition-colors ${done ? 'text-foreground font-semibold' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {done && <span className="ml-auto text-xs text-real font-mono font-semibold">✓ done</span>}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Result ────────────────────────────────────────────────────
  const confValue = analysisResult?.conf ?? 50
  const displaySummary = analysisResult?.summary || ''
  const displayMetrics = analysisResult?.metrics || []
  const detailedClaims: ClaimItem[] = analysisResult?.detailed_claims || []

  // Separate claims into TRUE and FAKE
  const trueClaims = detailedClaims.filter(c => c.status === 'true' || c.status === 'supported')
  const fakeClaims = detailedClaims.filter(c => c.status === 'fake' || c.status === 'contradicted' || c.status === 'needs_verification')
  const totalClaimsCount = detailedClaims.length

  const verdictCategory = analysisResult?.metadata?.verdict_category
  const verdictExplanation = analysisResult?.metadata?.verdict_explanation
  const displayVerdictText = verdictCategory || config.verdictText

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Verification Analysis Finalized</span>
          </div>
          <h1 className="text-3xl font-black text-foreground font-display tracking-tight mb-1">Article Verification Analysis</h1>
          <p className="text-xs text-muted-foreground font-mono">Timestamp: {new Date().toLocaleString()} · 60% Decision Threshold Rule</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setState('input'); setText(''); setUrl(''); setFile(null) }} className="flex items-center gap-2 border border-border/80 bg-card/60 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-secondary transition-all">
            <RefreshIcon size={14} /> New Analysis
          </button>
          <button onClick={handleSaveToggle} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-md ${saved ? 'bg-real text-white' : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'}`}>
            {saved ? <><CheckIcon size={14} /> Saved</> : <><BookmarkIcon size={14} /> Save Report</>}
          </button>
        </div>
      </div>

      {/* 1. FINAL ANALYSIS SUMMARY BANNER */}
      <div className="grid md:grid-cols-3 gap-5 mb-6">
        {/* Main verdict card */}
        <div className={`md:col-span-1 ${config.bgClass} border ${config.borderClass} rounded-2xl p-6 flex flex-col items-center text-center justify-between relative overflow-hidden backdrop-blur-xl shadow-lg`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col items-center w-full z-10">
            <div className="w-12 h-12 rounded-xl bg-card/80 border border-border flex items-center justify-center mb-3 shadow-md">
              <ResIcon size={24} className={config.textClass} />
            </div>
            <p className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Final Classification</p>
            <p className={`text-2xl font-black font-display tracking-tight mb-2 ${config.textClass}`}>{displayVerdictText}</p>
            {verdictExplanation && (
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mb-4 bg-background/40 p-2.5 rounded-xl border border-border/40 font-mono">
                {verdictExplanation}
              </p>
            )}
          </div>
          <div className="z-10 py-2">
            <CircularConfidence value={confValue} color={config.color} bgColor={config.ringBg} />
          </div>
        </div>

        {/* Content analysis summary & claim counters */}
        <div className="md:col-span-2 bg-card/80 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground font-display text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Executive Verification Summary
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Threshold: 60%</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed bg-background/50 p-4 rounded-xl border border-border/60 mb-5">
              {displaySummary}
            </p>
          </div>

          {/* Key Claim Summary Stat Boxes */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/70">
            <div className="bg-background/60 border border-border/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Total Analyzed</span>
              <span className="text-lg font-black font-mono text-foreground">{totalClaimsCount}</span>
            </div>
            <div className="bg-real/10 border border-real/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono uppercase text-real block mb-1">True Claims</span>
              <span className="text-lg font-black font-mono text-real">{trueClaims.length}</span>
            </div>
            <div className="bg-fake/10 border border-fake/30 rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono uppercase text-fake block mb-1">Fake Claims</span>
              <span className="text-lg font-black font-mono text-fake">{fakeClaims.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC ANALYTICS GRAPHS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <ClaimVerificationBreakdown detailedClaims={detailedClaims} />
        <EvidenceCoverageChart detailedClaims={detailedClaims} />
      </div>

      {/* 3. SIMPLIFIED CLAIM-BY-CLAIM SECTIONS */}
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
                  Meaningful statements supported by reliable evidence or verified sources ({trueClaims.length})
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-real/15 text-real border border-real/30 px-3 py-1 rounded-full">
              {trueClaims.length} TRUE
            </span>
          </div>

          {trueClaims.length === 0 ? (
            <div className="bg-background/50 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground font-mono">
              No factual claims in this article were verified as supported by reliable evidence.
            </div>
          ) : (
            <div className="space-y-4">
              {trueClaims.map((item, idx) => {
                const isExpanded = !!expandedClaims[item.claim_number]
                return (
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

                    {/* Supporting Evidence Link */}
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
                )
              })}
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
                  Statements that are false, fabricated, misleading, or contradicted by evidence ({fakeClaims.length})
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-fake/15 text-fake border border-fake/30 px-3 py-1 rounded-full">
              {fakeClaims.length} FAKE
            </span>
          </div>

          {fakeClaims.length === 0 ? (
            <div className="bg-background/50 border border-border/60 rounded-xl p-6 text-center text-xs text-muted-foreground font-mono">
              No false or contradicted claims were identified in this article.
            </div>
          ) : (
            <div className="space-y-4">
              {fakeClaims.map((item, idx) => {
                return (
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

                    {/* Contradictory Evidence Link */}
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
                )
              })}
            </div>
          )}
        </div>
      </div>


      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-mono font-medium animate-in fade-in slide-in-from-top-4 duration-300 border ${
            toast.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-500/50'
              : toast.type === 'info'
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50'
              : 'bg-slate-900/90 text-emerald-300 border-emerald-500/50 backdrop-blur-xl'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle size={16} className="text-red-400" />
          ) : toast.type === 'info' ? (
            <InfoIcon size={16} className="text-amber-400" />
          ) : (
            <CheckIcon size={16} className="text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Fallback Copy Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground font-display text-base">Export Shareable Dossier</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <XIcon size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              Secure permalink generated for this intelligence result:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareModalUrl}
                className="flex-1 bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none select-all"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareModalUrl)
                    showToast('Dossier link copied to clipboard!', 'success')
                    setShowShareModal(false)
                  } catch {
                    showToast('Please copy the URL directly from the text box.', 'info')
                  }
                }}
                className="bg-primary text-white text-xs font-mono font-bold px-4 py-2 rounded-xl hover:bg-primary-hover transition-all flex items-center gap-1.5"
              >
                <CopyIcon size={14} /> Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="text-xs font-mono font-medium text-muted-foreground hover:text-foreground px-3.5 py-1.5 rounded-lg border border-border hover:bg-secondary"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex gap-3 flex-wrap items-center pt-2">
        {analysisResult?.metadata?.real_article_id && (
          <button
            onClick={() => {
              const realId = analysisResult.metadata?.real_article_id
              window.location.hash = `#/real-articles/${realId}`
              window.history.pushState({}, '', `/real-articles/${realId}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
          >
            <NewspaperIcon size={16} /> Corroborated Article
          </button>
        )}

        <button
          onClick={handleDownloadReport}
          disabled={isDownloading}
          className="flex items-center gap-2 border border-border bg-card/60 px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent animate-spin rounded-full" />
              Generating PDF...
            </>
          ) : (
            <>
              <DownloadIcon size={15} /> Download PDF Dossier
            </>
          )}
        </button>

        <button
          onClick={handleShareResult}
          disabled={isSharing}
          className="flex items-center gap-2 border border-border bg-card/60 px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSharing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent animate-spin rounded-full" />
              Generating Link...
            </>
          ) : shareCopied ? (
            <>
              <CheckIcon size={15} className="text-real" /> Link Copied!
            </>
          ) : (
            <>
              <ShareIcon size={15} /> Share Link
            </>
          )}
        </button>

        <button
          onClick={() => navigate('history')}
          className="flex items-center gap-2 ml-auto border border-border bg-card/60 px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-all"
        >
          Audit History <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}


