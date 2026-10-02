import { useState, useEffect } from 'react'
import { Page } from '../App'
import {
  SearchIcon, ArrowRightIcon, ClockIcon, CheckCircleIcon,
  AlertTriangle, InfoIcon, DownloadIcon, TrashIcon, ZapIcon, BookmarkIcon,
  RefreshIcon
} from '../components/Icons'
import { api, HistoryItem } from '../services/api'

interface Props {
  navigate: (page: Page) => void
  initialFilter?: Filter
}

type Verdict = 'real' | 'fake'
type Filter = 'all' | Verdict | 'saved'

const verdictConfig = {
  real: {
    label: 'TRUE / REAL',
    bg: 'bg-real-bg',
    border: 'border-real-border',
    text: 'text-real',
    dot: 'bg-real',
    Icon: CheckCircleIcon,
  },
  fake: {
    label: 'FAKE NEWS',
    bg: 'bg-fake-bg',
    border: 'border-fake-border',
    text: 'text-fake',
    dot: 'bg-fake',
    Icon: AlertTriangle,
  },
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All Analyses' },
  { id: 'real', label: 'True / Real' },
  { id: 'fake', label: 'Fake News' },
  { id: 'saved', label: 'Saved' },
]

function VerdictBadge({ verdict }: { verdict: Verdict | string }) {
  const isReal = verdict === 'real'
  const c = isReal ? verdictConfig.real : verdictConfig.fake
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${c.bg} ${c.text} border ${c.border} px-2.5 py-1 rounded-full text-xs font-bold font-mono whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  )
}


export default function AnalysisHistory({ navigate, initialFilter = 'all' }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const loadHistory = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await api.getHistory({
        search: query.trim() || undefined,
        verdict: filter !== 'all' && filter !== 'saved' ? filter : undefined,
        bookmarked: filter === 'saved' ? true : undefined,
      })
      setHistory(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setFetchError(err.message || 'Unable to load analysis history. Please check your backend connection.')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadHistory()
  }, [filter])

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteHistory(id)
      setHistory((prev) => prev.filter((item) => item.id !== id))
    } catch {
      setHistory((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleToggleBookmark = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await api.toggleBookmark(id)
      setHistory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_bookmarked: updated.is_bookmarked } : item
        )
      )
    } catch {
      // optimistic fallback
      setHistory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_bookmarked: !item.is_bookmarked } : item
        )
      )
    }
  }

  const handleViewResult = (id: number) => {
    if (id) {
      window.location.hash = `#/shared/${id}`
      // Also update history state if needed
      window.history.pushState({}, '', `/shared/${id}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      navigate('analyzer')
    }
  }

  const filtered = history.filter((item) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'saved'
        ? item.is_bookmarked
        : item.verdict === filter

    const q = query.toLowerCase().trim()
    const matchesQuery =
      q === '' ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.snippet && item.snippet.toLowerCase().includes(q)) ||
      (item.summary && item.summary.toLowerCase().includes(q)) ||
      (item.input_type && item.input_type.toLowerCase().includes(q))

    return matchesFilter && matchesQuery
  })

  const counts = {
    all: history.length,
    real: history.filter((i) => i.verdict === 'real').length,
    fake: history.filter((i) => i.verdict === 'fake' || i.verdict === 'uncertain').length,
    saved: history.filter((i) => i.is_bookmarked).length,
  }


  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Forensic Verification Ledger
          </div>
          <h1 className="text-3xl font-black text-foreground font-display tracking-tight mb-1">Analysis History & Records</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Persistent audit log of processed intelligence claims and confidence reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('dashboard')}
            className="border border-border bg-card/60 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => navigate('analyzer')}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
          >
            <ZapIcon size={14} /> New Query
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by headline, source entity, or keywords…"
            className="w-full pl-11 pr-4 py-3 border border-border rounded-xl text-xs font-mono bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-md"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <button
          onClick={loadHistory}
          title="Refresh History"
          className="flex items-center justify-center gap-2 border border-border bg-card/60 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <RefreshIcon size={14} /> Sync Log
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition-all ${
              filter === id
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                : 'bg-card/70 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            <span>{label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                filter === id ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-card/80 border border-border rounded-2xl p-16 flex flex-col items-center justify-center text-center backdrop-blur-xl">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-bold text-foreground font-display">Syncing Forensic Audit Records...</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">Querying database store</p>
        </div>
      ) : fetchError ? (
        /* Error State */
        <div className="bg-card/80 border border-red-500/25 rounded-2xl p-12 text-center backdrop-blur-xl bg-red-500/5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-fake border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground font-display mb-1.5">Failed to Retrieve History Records</h2>
          <p className="text-xs text-muted-foreground font-mono max-w-md mx-auto mb-6 leading-relaxed">
            {fetchError}
          </p>
          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md"
          >
            <RefreshIcon size={14} /> Retry Connection
          </button>
        </div>
      ) : history.length === 0 ? (
        /* Empty State: Zero Analyses in DB */
        <div className="bg-card/80 border border-border rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-5 shadow-inner">
            <ClockIcon size={32} />
          </div>
          <h2 className="text-xl font-black text-foreground font-display mb-2">No analysis history yet.</h2>
          <p className="text-xs text-muted-foreground font-mono max-w-sm mb-6 leading-relaxed">
            Your completed analyses will appear here once you enter a claim or article to verify.
          </p>
          <button
            onClick={() => navigate('analyzer')}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
          >
            <ZapIcon size={16} /> Start your analysis
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State: Filter/Search yielded 0 matches */
        <div className="bg-card/80 border border-border rounded-2xl p-12 text-center backdrop-blur-xl">
          <div className="w-12 h-12 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <SearchIcon size={22} />
          </div>
          <h3 className="text-base font-bold text-foreground font-display mb-1">No Matching Records</h3>
          <p className="text-xs text-muted-foreground font-mono mb-4">
            No queries matched your search criteria or active filter state.
          </p>
          <button
            onClick={() => {
              setQuery('')
              setFilter('all')
            }}
            className="text-xs font-mono font-bold text-primary hover:underline"
          >
            Reset Query Parameters
          </button>
        </div>
      ) : (
        /* History Table & Cards */
        <div className="bg-card/80 border border-border rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-[minmax(0,1.2fr)_110px_130px_100px_140px_110px] gap-4 px-6 py-3.5 border-b border-border bg-secondary/50 text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            <p>Intelligence Subject / Content</p>
            <p>Source Vector</p>
            <p>Algorithmic Verdict</p>
            <p>Confidence</p>
            <p>Timestamp</p>
            <p className="text-right">Action</p>
          </div>

          {/* List of items */}
          <div className="divide-y divide-border/60">
            {filtered.map((item) => {
              const { id, title, snippet, verdict, confidence, created_at, input_type, is_bookmarked } = item
              const v = (verdict || 'fake').toLowerCase() as Verdict
              const c = (v === 'real' ? verdictConfig.real : verdictConfig.fake) || verdictConfig.fake


              const formattedDate = created_at
                ? new Date(created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recently'


              const displayTitle = title || snippet || 'Analyzed News Article'
              const formattedType = (input_type || 'text').toUpperCase()

              return (
                <div
                  key={id}
                  onClick={() => handleViewResult(id)}
                  className="group px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[minmax(0,1.2fr)_110px_130px_100px_140px_110px] gap-4 items-center">
                    {/* Headline / Snippet */}
                    <div className="min-w-0 pr-2">
                      <p className="text-xs text-foreground font-bold leading-relaxed line-clamp-2 mb-1 group-hover:text-primary transition-colors font-display">
                        {displayTitle}
                      </p>
                      {snippet && snippet !== displayTitle && (
                        <p className="text-[11px] text-muted-foreground truncate font-mono">{snippet}</p>
                      )}
                    </div>

                    {/* Input Type */}
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-mono font-bold border border-border uppercase">
                        {formattedType}
                      </span>
                    </div>

                    {/* Verdict */}
                    <div>
                      <VerdictBadge verdict={v} />
                    </div>

                    {/* Confidence */}
                    <div>
                      <span className={`font-mono font-bold text-xs ${c.text}`}>{confidence}%</span>
                      <div className="mt-1 h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full ${c.dot} rounded-full`} style={{ width: `${confidence}%` }} />
                      </div>
                    </div>

                    {/* Date */}
                    <p className="text-[11px] text-muted-foreground font-mono">{formattedDate}</p>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewResult(id)}
                        className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border border-primary/20"
                        title="View full report"
                      >
                        Inspect <ArrowRightIcon size={11} />
                      </button>

                      <button
                        onClick={(e) => handleToggleBookmark(id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          is_bookmarked
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                        title={is_bookmarked ? 'Remove bookmark' : 'Bookmark result'}
                      >
                        <BookmarkIcon size={14} />
                      </button>

                      <button
                        onClick={(e) => handleDelete(id, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-fake hover:bg-fake-bg transition-colors opacity-60 group-hover:opacity-100"
                        title="Delete scan"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-foreground font-bold leading-snug line-clamp-2">
                        {displayTitle}
                      </p>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0 uppercase">
                        {formattedType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <VerdictBadge verdict={v} />
                      <span className={`font-mono font-bold text-xs ${c.text}`}>{confidence}% confidence</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{formattedDate}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleBookmark(id, e)}
                          className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 ${
                            is_bookmarked ? 'text-amber-500' : 'text-muted-foreground'
                          }`}
                        >
                          <BookmarkIcon size={14} /> {is_bookmarked ? 'Saved' : 'Save'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(id, e)}
                          className="p-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-fake flex items-center gap-1"
                        >
                          <TrashIcon size={14} /> Delete
                        </button>
                      </div>

                      <button
                        onClick={() => handleViewResult(id)}
                        className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-sm"
                      >
                        Inspect <ArrowRightIcon size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 bg-secondary/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>
              Catalog: {filtered.length} of {history.length} records displayed
            </span>
            <span>TruthLens AI Forensic Engine</span>
          </div>
        </div>
      )}
    </div>
  )
}
