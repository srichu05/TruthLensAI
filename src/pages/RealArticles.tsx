import { useState, useEffect } from 'react'
import { Page } from '../App'
import {
  NewspaperIcon, SearchIcon, ExternalLinkIcon, ZapIcon,
  ArrowRightIcon, CheckCircleIcon, AlertTriangle, InfoIcon
} from '../components/Icons'
import { api, RealArticleItem } from '../services/api'

interface Props {
  navigate: (page: Page) => void
  onSelectArticle?: (id: number) => void
}

const verdictConfig = {
  fake:      { label: 'LIKELY FAKE',          bg: 'bg-fake-bg',      border: 'border-fake-border',      text: 'text-fake',      dot: 'bg-fake' },
  uncertain: { label: 'MIXED / MISLEADING',    bg: 'bg-uncertain-bg', border: 'border-uncertain-border', text: 'text-uncertain', dot: 'bg-uncertain' },
  real:      { label: 'LIKELY REAL',          bg: 'bg-real-bg',      border: 'border-real-border',      text: 'text-real',      dot: 'bg-real' },
}

export default function RealArticles({ navigate, onSelectArticle }: Props) {
  const [articles, setArticles] = useState<RealArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'fake' | 'uncertain'>('all')

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const data = await api.getRealArticles({
        search: search.trim() || undefined,
        verdict: filter !== 'all' ? filter : undefined
      })
      setArticles(data)
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [filter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchArticles()
  }

  const handleOpenAnalysis = (analysisId?: number) => {
    if (analysisId) {
      window.location.hash = `#/shared/${analysisId}`
      window.history.pushState({}, '', `/shared/${analysisId}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      navigate('analyzer')
    }
  }

  const handleOpenDetail = (article: RealArticleItem) => {
    if (onSelectArticle) {
      onSelectArticle(article.id)
    } else {
      window.location.hash = `#/real-articles/${article.id}`
      window.history.pushState({}, '', `/real-articles/${article.id}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Corroborated Knowledge Graph</span>
        </div>
        <h1 className="text-3xl font-black text-foreground font-display tracking-tight mb-1">Evidence & Real Articles Library</h1>
        <p className="text-xs text-muted-foreground font-mono">
          Verified institutional sources and debunked claims cataloged during automated forensic scans.
        </p>
      </div>

      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headline, claim, or source entity..."
            className="w-full pl-11 pr-4 py-3 bg-card/80 border border-border rounded-xl text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-md"
          />
        </form>

        <div className="flex items-center gap-1.5 p-1 bg-card/80 border border-border rounded-xl self-start sm:self-auto backdrop-blur-md">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Entries
          </button>
          <button
            onClick={() => setFilter('fake')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              filter === 'fake'
                ? 'bg-fake text-white shadow-md shadow-fake/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Contradicted
          </button>
          <button
            onClick={() => setFilter('uncertain')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              filter === 'uncertain'
                ? 'bg-uncertain text-white shadow-md shadow-uncertain/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Unverified
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center bg-card/80 border border-border rounded-2xl backdrop-blur-xl">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-foreground font-display">Querying Evidence Library...</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">Retrieving cross-referenced records</p>
        </div>
      ) : articles.length === 0 ? (
        /* Empty State */
        <div className="bg-card/80 border border-border rounded-2xl p-12 text-center my-6 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <NewspaperIcon size={30} />
          </div>
          <h3 className="text-lg font-black text-foreground font-display mb-1.5">No Corroborated Records Found</h3>
          <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto mb-6 leading-relaxed">
            Execute a credibility analysis and verified ground-truth articles will be indexed here.
          </p>
          <button
            onClick={() => navigate('analyzer')}
            className="inline-flex items-center gap-2 bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
          >
            <ZapIcon size={14} /> Ingest New Content
          </button>
        </div>
      ) : (
        /* Article Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((item) => {
            const vKey = item.original_verdict as keyof typeof verdictConfig
            const vCfg = verdictConfig[vKey] || verdictConfig.fake
            const displayDate = item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Recent'

            return (
              <div
                key={item.id}
                className="bg-card/80 border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between backdrop-blur-xl"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className={`inline-flex items-center gap-1.5 ${vCfg.bg} ${vCfg.text} border ${vCfg.border} px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${vCfg.dot}`} />
                      {vCfg.label}
                    </span>

                    <span className="text-[10px] font-mono uppercase bg-secondary text-muted-foreground px-2.5 py-0.5 rounded-md border border-border/80">
                      {item.input_type || 'Text'}
                    </span>
                  </div>

                  {/* Original Article / Claim */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
                      Target Assertion
                    </p>
                    <h3 className="text-sm font-bold text-foreground font-display leading-snug line-clamp-2">
                      "{item.original_title || item.original_claim}"
                    </h3>
                  </div>

                  {/* What Actually Happened */}
                  <div className="bg-background/60 rounded-xl p-3.5 border border-border/70 mb-4 space-y-1">
                    <p className="text-[11px] font-bold text-primary font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircleIcon size={13} /> Corroborated Evidence
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.what_actually_happened}
                    </p>
                  </div>

                  {/* Meta: Source & Date */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 mb-4 border-t border-border/60 font-mono text-[11px]">
                    <div className="truncate max-w-[60%]">
                      <span>Primary Source: </span>
                      <strong className="text-foreground">{item.verified_source_name}</strong>
                    </div>
                    <span>{displayDate}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {item.verified_source_url ? (
                    <a
                      href={item.verified_source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-primary/20 transition-colors"
                    >
                      External <ExternalLinkIcon size={12} />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleOpenDetail(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-primary/20 transition-colors"
                    >
                      Inspect <ArrowRightIcon size={12} />
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenDetail(item)}
                    className="flex-1 flex items-center justify-center gap-1 border border-border bg-card/60 text-foreground text-xs font-mono font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-secondary transition-all"
                  >
                    Dossier
                  </button>

                  <button
                    onClick={() => handleOpenAnalysis(item.analysis_id)}
                    title="View Original Analysis"
                    className="px-3.5 py-2.5 border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl text-xs font-mono font-bold uppercase transition-all"
                  >
                    Scan
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
