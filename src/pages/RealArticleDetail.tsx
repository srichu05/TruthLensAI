import { useState, useEffect } from 'react'
import { Page } from '../App'
import {
  NewspaperIcon, ArrowRightIcon, ExternalLinkIcon, CheckCircleIcon,
  AlertTriangle, ShieldIcon, LinkIcon
} from '../components/Icons'
import { api, RealArticleItem } from '../services/api'

interface Props {
  articleId: number | string
  navigate: (page: Page) => void
  onBack: () => void
}

const verdictConfig = {
  fake:      { label: 'FAKE NEWS',            bg: 'bg-fake-bg',      border: 'border-fake-border',      text: 'text-fake',      dot: 'bg-fake' },
  uncertain: { label: 'FAKE NEWS',            bg: 'bg-fake-bg',      border: 'border-fake-border',      text: 'text-fake',      dot: 'bg-fake' },
  real:      { label: 'TRUE / REAL NEWS',     bg: 'bg-real-bg',      border: 'border-real-border',      text: 'text-real',      dot: 'bg-real' },
}


export default function RealArticleDetail({ articleId, navigate, onBack }: Props) {
  const [article, setArticle] = useState<RealArticleItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getRealArticleById(articleId)
        setArticle(data)
      } catch (err: any) {
        setError(err.message || 'Real article details not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [articleId])

  const handleOpenAnalysis = () => {
    if (article?.analysis_id) {
      window.location.hash = `#/shared/${article.analysis_id}`
      window.history.pushState({}, '', `/shared/${article.analysis_id}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      navigate('analyzer')
    }
  }

  if (loading) {
    return (
      <div className="p-12 max-w-4xl mx-auto text-center page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-xs text-muted-foreground">Loading verified real article details...</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-14 h-14 rounded-2xl bg-fake-bg text-fake flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold text-foreground font-display mb-2">Verified Information Not Found</h2>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          {error || 'This real article record could not be loaded.'}
        </p>
        <button
          onClick={onBack}
          className="bg-primary text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all"
        >
          Back to Real Articles
        </button>
      </div>
    )
  }

  const vKey = article.original_verdict as keyof typeof verdictConfig
  const vCfg = verdictConfig[vKey] || verdictConfig.fake
  const formattedDate = article.created_at
    ? new Date(article.created_at).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Recently Analyzed'

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors border border-border bg-card/60 px-3.5 py-2 rounded-xl"
        >
          ← Back to Library
        </button>

        <div className="flex items-center gap-2.5">
          {article.verified_source_url && (
            <a
              href={article.verified_source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
            >
              Primary Record <ExternalLinkIcon size={13} />
            </a>
          )}
          <button
            onClick={handleOpenAnalysis}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-border bg-card/60 text-foreground px-4 py-2.5 rounded-xl hover:bg-secondary transition-all"
          >
            Forensic Telemetry <ArrowRightIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Title Header */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 md:p-8 mb-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">
            EVIDENCE DOSSIER & INSTITUTIONAL RECORD
          </span>
          <span className="text-muted-foreground text-xs">•</span>
          <span className="text-xs text-muted-foreground font-mono">{formattedDate}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground leading-tight tracking-tight mb-5">
          {article.original_title}
        </h1>

        <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border/80">
          <span className={`inline-flex items-center gap-1.5 ${vCfg.bg} ${vCfg.text} border ${vCfg.border} px-3 py-1 rounded-full text-xs font-bold font-mono`}>
            <span className={`w-1.5 h-1.5 rounded-full ${vCfg.dot}`} />
            Algorithmic Verdict: {vCfg.label}
          </span>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1 rounded-lg border border-border/60">
            Confidence: <strong className="text-foreground">{article.confidence}%</strong>
          </span>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1 rounded-lg border border-border/60">
            Vector: <strong className="text-foreground uppercase">{article.input_type}</strong>
          </span>
        </div>
      </div>

      {/* 1. ORIGINAL CLAIM / ARTICLE */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 mb-6 shadow-sm backdrop-blur-xl">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 font-mono">
          INGESTED STATEMENT / ASSERTION
        </h2>
        <div className="p-4 bg-background/60 rounded-xl border border-border/70 text-sm font-semibold text-foreground leading-relaxed italic">
          "{article.original_claim}"
        </div>
      </div>

      {/* 2. WHAT WAS WRONG? */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 mb-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-fake-bg text-fake border border-fake-border flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
            Discrepancy Analysis
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-background/40 p-4 rounded-xl border border-border/50">
          {article.what_was_wrong}
        </p>
      </div>

      {/* 3. WHAT ACTUALLY HAPPENED? */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 mb-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-real-bg text-real border border-real-border flex items-center justify-center">
            <CheckCircleIcon size={16} />
          </div>
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
            Corroborated Ground Truth
          </h2>
        </div>
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground leading-relaxed whitespace-pre-line">
          {article.what_actually_happened}
        </div>
      </div>

      {/* 4. VERIFIED SOURCES */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 mb-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <ShieldIcon size={18} />
          </div>
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
            Primary Institutional Records & Citations
          </h2>
        </div>

        {article.sources && article.sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {article.sources.map((src, i) => (
              <div key={i} className="bg-background/80 border border-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xs font-bold text-foreground font-display">
                      {src.source_name}
                    </h3>
                    {src.date && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {src.date}
                      </span>
                    )}
                  </div>
                  {src.title && (
                    <p className="text-xs italic text-foreground mb-1.5">
                      "{src.title}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {src.summary}
                  </p>
                </div>

                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary hover:underline pt-1"
                  >
                    Open Source ↗
                  </a>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground italic">
                    Institutional archive record
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-background/50 rounded-xl text-xs font-mono text-muted-foreground border border-border">
            Primary Record: <strong className="text-foreground">{article.verified_source_name}</strong>
          </div>
        )}
      </div>

      {/* 5. TRUTHLENS ANALYSIS CTA CARD */}
      <div className="bg-card/60 border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
        <div>
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground mb-1">
            Complete NLP Verification Ledger
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            Inspect individual claim extractions, semantic confidence charts, and gradient boost telemetry.
          </p>
        </div>
        <button
          onClick={handleOpenAnalysis}
          className="bg-primary text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-primary-hover transition-all flex items-center gap-2 self-start sm:self-auto shadow-md shadow-primary/20"
        >
          Inspect Full Ledger <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}
