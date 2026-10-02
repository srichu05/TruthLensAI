import { useState, useEffect, useRef } from 'react'
import { Page, User } from '../App'
import {
  ZapIcon, ArrowRightIcon, ClockIcon, CheckCircleIcon,
  AlertTriangle, InfoIcon, UploadIcon, LinkIcon, FileTextIcon,
  TrendingUpIcon, NewspaperIcon, PlusIcon
} from '../components/Icons'
import { api, DashboardStatsData, HistoryItem } from '../services/api'

interface Props { navigate: (page: Page) => void; user: User | null }

const verdictConfig = {
  real:      { label: 'TRUE / REAL',  bg: 'bg-real-bg',      border: 'border-real-border',      text: 'text-real',      dot: 'bg-real' },
  fake:      { label: 'FAKE NEWS',    bg: 'bg-fake-bg',      border: 'border-fake-border',      text: 'text-fake',      dot: 'bg-fake' },
  uncertain: { label: 'FAKE NEWS',    bg: 'bg-fake-bg',      border: 'border-fake-border',      text: 'text-fake',      dot: 'bg-fake' },
}

function VerdictBadge({ verdict }: { verdict: keyof typeof verdictConfig | string }) {
  const c = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.fake
  return (
    <span className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} border ${c.border} px-2.5 py-0.5 rounded-full text-xs font-bold font-mono`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ navigate, user }: Props) {
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [recent, setRecent] = useState<HistoryItem[]>([])
  const firstName = user?.name?.split(' ')[0] || 'Analyst'

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, historyData] = await Promise.all([
          api.getDashboardStats(),
          api.getHistory()
        ])
        setStats(statsData)
        setRecent(Array.isArray(historyData) ? historyData.slice(0, 5) : [])
      } catch {
        setStats({
          total_scans: 0,
          real_count: 0,
          fake_count: 0,
          uncertain_count: 0,
          real_articles_count: 0,
          avg_confidence: 0,
          accuracy_rate: 0
        })
        setRecent([])
      }
    }
    loadDashboard()
  }, [])

  const statCards = [
    { label: 'Total Analyses',  value: String(stats?.total_scans ?? 0),         icon: TrendingUpIcon,   color: 'text-primary',   bg: 'bg-primary/10',    target: 'history' as Page, trend: 'Indexed' },
    { label: 'True / Real News', value: String(stats?.real_count ?? 0),          icon: CheckCircleIcon,  color: 'text-real',      bg: 'bg-real-bg',       target: 'history' as Page, trend: 'Verified' },
    { label: 'Fake News',       value: String(stats?.fake_count ?? 0),          icon: AlertTriangle,   color: 'text-fake',      bg: 'bg-fake-bg',       target: 'history' as Page, trend: 'Flagged' },
    { label: 'Evidence Library',value: String(stats?.real_articles_count ?? 0), icon: NewspaperIcon,   color: 'text-cyan-400',  bg: 'bg-cyan-500/10',   target: 'real-articles' as Page, trend: 'Sources' },
  ]


  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const txtInputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    setSelectedFile(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    if (txtInputRef.current) txtInputRef.current.value = ''
  }

  const handleAnalyze = () => {
    navigate('analyzer')
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-7" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Hidden file pickers */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0])
          }
        }}
      />
      <input
        ref={txtInputRef}
        type="file"
        accept=".txt,.md,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0])
          }
        }}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              Live Workspace
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Multi-signal claim analysis and cross-source evidence intelligence dashboard.
          </p>
        </div>

        <button
          onClick={() => navigate('analyzer')}
          className="self-start sm:self-center flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider hover:bg-primary-hover shadow-lg shadow-primary/25 border border-primary/30 transition-all"
        >
          <PlusIcon size={15} /> Launch Analyzer
        </button>
      </div>

      {/* Compact Start New Analysis Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm glow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <ZapIcon size={16} />
            </div>
            <div>
              <h2 className="font-bold text-foreground font-display text-sm leading-tight">Quick Ingestion Studio</h2>
              <p className="text-[11px] text-muted-foreground font-mono">Select input channel for instant claim verification</p>
            </div>
          </div>

          {selectedFile && (
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-3 py-1 rounded-full truncate max-w-[240px]">
              📄 {selectedFile.name}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Channel buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => pdfInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                selectedFile?.name.endsWith('.pdf')
                  ? 'bg-primary/20 text-primary border-primary shadow-xs'
                  : 'bg-secondary/70 border-border text-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              <UploadIcon size={13} className="text-primary" /> Upload PDF
            </button>
            <button
              onClick={() => txtInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                selectedFile && !selectedFile.name.endsWith('.pdf')
                  ? 'bg-primary/20 text-primary border-primary shadow-xs'
                  : 'bg-secondary/70 border-border text-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              <FileTextIcon size={13} className="text-primary" /> Upload TXT
            </button>
            <button
              onClick={() => navigate('analyzer')}
              className="flex items-center gap-2 bg-secondary/70 border border-border px-4 py-2 rounded-xl text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-all"
            >
              <LinkIcon size={13} className="text-primary" /> Paste URL / Text
            </button>
          </div>

          {/* Action trigger */}
          <div className="flex items-center gap-2 justify-end">
            {selectedFile && (
              <button
                onClick={handleClear}
                className="border border-border px-4 py-2 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md shadow-primary/25 border border-primary/40"
            >
              <ZapIcon size={13} /> Run AI Engine
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, target, trend }) => (
          <button
            key={label}
            onClick={() => navigate(target)}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg transition-all text-left group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3 w-full">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center border border-border/50`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <div className="flex items-baseline justify-between w-full">
              <p className={`text-3xl font-extrabold font-mono ${color}`}>{value}</p>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{trend}</span>
            </div>
          </button>
        ))}
      </div>


      {/* Analytics & Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Credibility Distribution Donut/Ring Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground font-display text-sm">Credibility Distribution</h3>
              <p className="text-xs text-muted-foreground">Ratio of analyzed veracity results</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUpIcon size={16} />
            </div>
          </div>

          {(stats?.total_scans ?? 0) === 0 ? (
            <div className="py-8 px-4 text-center my-auto flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-border flex items-center justify-center mb-3">
                <span className="text-xs text-muted-foreground font-mono">0 Scans</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Your analytics will appear here</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Analyze your first news article to start building your credibility insights.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-2">
              {/* SVG Donut Chart */}
              <div className="relative w-44 h-44 my-2">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    className="text-border/40"
                  />
                  {/* Real Segment */}
                  {stats && stats.real_count > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="#557E37"
                      strokeWidth="3.4"
                      strokeDasharray={`${(stats.real_count / stats.total_scans) * 100} ${100 - (stats.real_count / stats.total_scans) * 100}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Fake Segment */}
                  {stats && stats.fake_count > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="transparent"
                      stroke="#A84232"
                      strokeWidth="3.4"
                      strokeDasharray={`${(stats.fake_count / stats.total_scans) * 100} ${100 - (stats.fake_count / stats.total_scans) * 100}`}
                      strokeDashoffset={`-${(stats.real_count / stats.total_scans) * 100}`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold font-mono text-foreground leading-none">
                    {stats?.total_scans ?? 0}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mt-1">
                    Analyses
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-border mt-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-real" />
                    <span className="text-[11px] font-semibold text-muted-foreground">True / Real</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {stats?.total_scans ? Math.round((stats.real_count / stats.total_scans) * 100) : 0}%
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-fake" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Fake News</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {stats?.total_scans ? Math.round((stats.fake_count / stats.total_scans) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verification Overview & Performance Metric Card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground font-display text-sm">Credibility & Veracity Metrics</h3>
              <p className="text-xs text-muted-foreground">Aggregated verification statistics across your history</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-foreground font-medium border border-border">
                Live Insights
              </span>
            </div>
          </div>

          {(stats?.total_scans ?? 0) === 0 ? (
            <div className="py-12 px-6 text-center my-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center mb-3">
                <TrendingUpIcon size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No metrics available yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Analyze news articles to visualize your credibility breakdown, average confidence scores, and detection patterns.
              </p>
              <button
                onClick={() => navigate('analyzer')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                Scan an article <ArrowRightIcon size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Horizontal Bar Breakdown */}
              <div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                  <span>Likely Real Articles (≥60%)</span>
                  <span className="font-mono font-bold text-foreground">
                    {stats?.real_count ?? 0} ({stats?.total_scans ? Math.round((stats.real_count / stats.total_scans) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex border border-border/50">
                  <div
                    className="bg-real h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${stats?.total_scans ? (stats.real_count / stats.total_scans) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                  <span>Likely Fake / Misleading (&lt;60%)</span>
                  <span className="font-mono font-bold text-foreground">
                    {stats?.fake_count ?? 0} ({stats?.total_scans ? Math.round((stats.fake_count / stats.total_scans) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex border border-border/50">
                  <div
                    className="bg-fake h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${stats?.total_scans ? (stats.fake_count / stats.total_scans) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Summary Badges footer */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                  <p className="text-[11px] text-muted-foreground">Avg Confidence</p>
                  <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                    {stats?.avg_confidence ?? 0}%
                  </p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl border border-border/60">
                  <p className="text-[11px] text-muted-foreground">Authentic Ratio</p>
                  <p className="text-lg font-bold font-mono text-real mt-0.5">
                    {stats?.total_scans ? Math.round((stats.real_count / stats.total_scans) * 100) : 0}%
                  </p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl border border-border/60 col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-muted-foreground">Misinfo Flagged</p>
                  <p className="text-lg font-bold font-mono text-fake mt-0.5">
                    {stats?.fake_count ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent analyses */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClockIcon size={16} className="text-muted-foreground" />
            <h2 className="font-bold text-foreground font-display text-sm">Recent Analyses</h2>
          </div>
          <button
            onClick={() => navigate('history')}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRightIcon size={12} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <ClockIcon size={22} />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No recent analyses yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              Your analyzed news articles and veracity predictions will appear here.
            </p>
            <button
              onClick={() => navigate('analyzer')}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Start an analysis now <ArrowRightIcon size={12} />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((item) => {
              const displayTitle = item.title || item.snippet
              const displayDate = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'

              return (
                <button
                  key={item.id || displayTitle}
                  onClick={() => {
                    if (item.id) {
                      window.location.hash = `#/shared/${item.id}`
                      window.history.pushState({}, '', `/shared/${item.id}`)
                      window.dispatchEvent(new PopStateEvent('popstate'))
                    } else {
                      navigate('analyzer')
                    }
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium leading-snug truncate mb-2">{displayTitle}</p>
                    <div className="flex items-center gap-3">
                      <VerdictBadge verdict={item.verdict as keyof typeof verdictConfig} />
                      <span className="text-xs font-mono text-muted-foreground">{item.confidence}% confidence</span>
                      <span className="text-xs text-muted-foreground ml-auto">{displayDate}</span>
                    </div>
                  </div>
                  <ArrowRightIcon size={15} className="text-muted-foreground flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

