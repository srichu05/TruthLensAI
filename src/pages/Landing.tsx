import { Page } from '../App'
import {
  ShieldIcon, ZapIcon, BrainIcon, CheckCircleIcon, ArrowRightIcon, CheckIcon,
  TrendingUpIcon, InfoIcon, FileTextIcon, SearchIcon, ChevronRightIcon,
  UploadIcon, LinkIcon, LockIcon, SunIcon, MoonIcon
} from '../components/Icons'
import LiveAnalysisVisualization from '../components/LiveAnalysisVisualization'
import { useTheme } from '../utils/theme'

interface Props { navigate: (page: Page) => void }

const FEATURES = [
  {
    Icon: ZapIcon,
    title: 'AI-Assisted News Analysis',
    desc: 'Extracts deep linguistic, stylistic, and structural patterns to detect deceptive manipulation with high precision.',
    tag: 'NLP Engine'
  },
  {
    Icon: FileTextIcon,
    title: 'Claim-by-Claim Breakdown',
    desc: 'Isolates and validates individual assertions within large articles, assigning confidence scores to each point.',
    tag: 'Claim Parser'
  },
  {
    Icon: SearchIcon,
    title: 'Cross-Source Evidence Retrieval',
    desc: 'Cross-references claim assertions against thousands of authoritative records and verified journalism archives.',
    tag: 'Evidence Index'
  },
  {
    Icon: BrainIcon,
    title: 'Explainable AI & SHAP Attribution',
    desc: 'Clear attribution values for every decision. See the exact phrases and indicators that drove the verdict.',
    tag: 'Transparent AI'
  },
  {
    Icon: UploadIcon,
    title: 'Multi-Modal Ingestion (Text, URL, PDF)',
    desc: 'Support for raw text, live web URLs, and document uploads (PDF, TXT, DOCX) with automated cleaning.',
    tag: 'Ingestion Studio'
  },
  {
    Icon: TrendingUpIcon,
    title: 'Analytics & Evidence Dashboard',
    desc: 'Track historical credibility trends, verdict distributions, and accuracy metrics in a unified operations hub.',
    tag: 'Analytics'
  },
  {
    Icon: BookmarkIconTag,
    title: 'Saved Intelligence & Dossiers',
    desc: 'Bookmark crucial investigation records and organize verified intelligence dossiers for long-term reference.',
    tag: 'Saved Results'
  },
  {
    Icon: LockIcon,
    title: 'PDF Dossier Generation',
    desc: 'Generate cryptographic-grade PDF verification reports suitable for journalistic and legal citation.',
    tag: 'Export Ready'
  },
]

function BookmarkIconTag({ size = 18 }: { size?: number }) {
  return <CheckCircleIcon size={size} />
}

const SIX_STAGES = [
  {
    step: '01',
    title: 'Validate Input',
    desc: 'Extract clean article text from raw text, web URLs, or uploaded PDF/TXT documents, stripping boilerplate.',
    Icon: FileTextIcon,
  },
  {
    step: '02',
    title: 'Extract Text',
    desc: 'Tokenize, normalize Unicode, and parse linguistic structures for lexical diversity and emotional intensity.',
    Icon: BrainIcon,
  },
  {
    step: '03',
    title: 'Identify Claims',
    desc: 'Isolate standalone factual claims from opinion and rhetoric using specialized assertion classifiers.',
    Icon: ZapIcon,
  },
  {
    step: '04',
    title: 'Retrieve Evidence',
    desc: 'Query verified registries, institutional domain records, and fact-checking knowledge graphs.',
    Icon: SearchIcon,
  },
  {
    step: '05',
    title: 'Evaluate Indicators',
    desc: 'Run multi-model gradient boosting and transformer embeddings across 12 credibility dimensions.',
    Icon: TrendingUpIcon,
  },
  {
    step: '06',
    title: 'Prepare Report',
    desc: 'Synthesize clean binary classifications (TRUE / REAL NEWS vs. FAKE NEWS) with True/Fake claim evidence.',
    Icon: CheckCircleIcon,
  },
]


const STATS = [
  { value: '94.2%', label: 'Classification Accuracy', sub: 'Benchmarked on verified datasets' },
  { value: '50K+',  label: 'Verified Claims',        sub: 'Indexed across fact registries' },
  { value: '<1.8s', label: 'Inference Latency',      sub: 'Real-time multi-signal analysis' },
  { value: '12+',   label: 'Linguistic NLP Signals', sub: 'Sensationalism, bias & citations' },
]

export default function Landing({ navigate }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const scrollToHowItWorks = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    const element = document.getElementById('how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background text-foreground tech-grid-pattern selection:bg-primary/30 selection:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Glow ambient background elements */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[-100px] w-[500px] h-[500px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/80">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20">
              <ShieldIcon size={18} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-foreground font-display text-lg tracking-tight">TruthLens</span>
              <span className="ml-1.5 text-[10px] font-mono font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded border border-primary/30">
                AI
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7">
            <a
              href="#how-it-works"
              onClick={scrollToHowItWorks}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider font-mono"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider font-mono"
            >
              Features
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              className="p-2 rounded-xl border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? <SunIcon size={16} className="text-amber-400" /> : <MoonIcon size={16} className="text-blue-600" />}
            </button>

            <button
              onClick={() => navigate('login')}
              className="text-xs font-bold text-foreground hover:text-primary transition-colors px-3 py-2 font-mono uppercase tracking-wider"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('signup')}
              className="text-xs font-bold bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/25 border border-primary/40 font-mono uppercase tracking-wider"
            >
              Sign Up →
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 sm:pt-32 md:pt-36 pb-16 md:pb-20 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Copy (Left Side) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2.5 bg-primary/10 border border-primary/25 text-primary px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold mb-5 w-fit">
              <span className="w-2 h-2 rounded-full bg-cyan-400 radar-pulse" />
              <span className="uppercase tracking-wider">EVIDENCE INTELLIGENCE PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5 font-display text-foreground tracking-tight">
              See beyond <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                the headline.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-7 font-normal max-w-xl">
              Analyze claims, explore evidence, and understand the signals behind AI-assisted news verification.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <button
                onClick={() => navigate('analyzer')}
                className="flex items-center justify-center gap-2.5 bg-primary text-white px-7 py-3.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/30 border border-primary/40 text-center"
              >
                Start analyzing →
              </button>
              <a
                href="#how-it-works"
                onClick={scrollToHowItWorks}
                className="flex items-center justify-center gap-2 border border-border bg-card/60 backdrop-blur px-6 py-3.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-secondary hover:border-primary/30 transition-all text-center"
              >
                Explore how it works ↓
              </a>
            </div>

            {/* Small Trust Indicators */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 pt-6 border-t border-border/60">
              {[
                'Transparent by design',
                'Evidence-aware',
                'Explainable analysis'
              ].map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual: Realistic Live Analysis Visualization (Right Side) */}
          <div className="lg:col-span-6 xl:col-span-5 w-full flex justify-center">
            <LiveAnalysisVisualization />
          </div>
        </div>
      </section>

      {/* Stats Metric Strip */}
      <section className="border-y border-border bg-card/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map(({ value, label, sub }) => (
              <div key={label} className="border-l-2 border-primary/40 pl-4 sm:pl-5">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground font-mono mb-1">{value}</p>
                <p className="text-xs font-bold text-foreground uppercase tracking-wider font-display mb-0.5">{label}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section (6 Stages) */}
      <section id="how-it-works" className="py-24 px-6 md:px-10 max-w-7xl mx-auto scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-mono font-bold mb-3 uppercase tracking-wider">
            Verification Pipeline
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-foreground mb-3">
            How TruthLens Analyzes Content
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed font-mono">
            An end-to-end evidence discovery architecture turning raw assertions into verified intelligence.
          </p>
        </div>

        {/* 6 Stage Timeline Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {SIX_STAGES.map((stageItem) => {
            const { step, title, desc, Icon } = stageItem
            return (
              <div key={step} className="relative flex flex-col group">
                <div className="bg-card/80 border border-border rounded-2xl p-6 h-full flex flex-col justify-between hover:border-primary/40 hover:shadow-xl transition-all duration-200 backdrop-blur-xl">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/25">
                        STAGE {step}
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-display text-foreground mb-2">
                      {step} — {title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Pipeline Phase</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 md:px-10 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-mono font-bold mb-3 uppercase tracking-wider">
              Technical Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-foreground mb-3">
              Engineered for Precision & Explainability
            </h2>
            <p className="text-muted-foreground text-sm">
              Designed for investigators, researchers, journalists, and truth-conscious organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ Icon, title, desc, tag }) => (
              <div key={title} className="p-6 bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center mb-4 border border-border">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-sm font-display">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-border/60">
                  <span className="text-[10px] font-mono text-primary font-bold">{tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-24 px-6 md:px-10 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-b from-primary/15 via-card to-card border border-primary/30 rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-2xl glow-primary">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold text-primary uppercase tracking-widest block mb-3">
              Get Started In Seconds
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground font-display mb-4">
              Stop Speculating. Start Verifying.
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Verify claims, uncover misleading narratives, and export authoritative fact-checking reports in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('signup')}
                className="w-full sm:w-auto bg-primary text-white px-8 py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider hover:bg-primary-hover hover:scale-105 transition-all shadow-xl border border-white/20"
              >
                Create Free Account →
              </button>
              <button
                onClick={() => navigate('login')}
                className="w-full sm:w-auto bg-secondary border border-border text-foreground px-6 py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider hover:bg-muted transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 md:px-10 bg-sidebar-bg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white">
              <ShieldIcon size={12} />
            </div>
            <span className="font-bold text-foreground font-display">TruthLens AI</span>
            <span>· Evidence & Claim Verification Console</span>
          </div>
          <p>© 2026 TruthLens AI. Evidence Engine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}


