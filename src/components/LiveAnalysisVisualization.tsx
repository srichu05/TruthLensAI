import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldIcon, FileTextIcon, GlobeIcon, BarChart2Icon
} from './Icons'

export default function LiveAnalysisVisualization() {
  const [activeNode, setActiveNode] = useState<'claim' | 'core' | 'evidence' | 'signals' | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [claimProgress, setClaimProgress] = useState(88)
  const [signalBars, setSignalBars] = useState([78, 92, 45, 88, 62, 74])
  const containerRef = useRef<HTMLDivElement>(null)

  // Simulation tick for signals waveform & realistic data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalBars(prev => prev.map(val => {
        const delta = (Math.random() * 8) - 4
        return Math.min(98, Math.max(30, Math.round(val + delta)))
      }))
      setClaimProgress(prev => {
        const next = prev + 1
        return next > 96 ? 78 : next
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // 3D subtle perspective tilt on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: x * 6, y: -y * 6 })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setActiveNode(null)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-xl mx-auto transition-transform duration-300 ease-out select-none"
      style={{
        perspective: '1200px',
      }}
    >
      {/* Outer ambient glow backlight */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-indigo-600/30 rounded-3xl blur-2xl opacity-70 transition-opacity -z-10" />

      {/* Main Perspective Container */}
      <div
        className="relative rounded-2xl md:rounded-3xl border border-blue-500/30 bg-[#070B14]/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(59, 130, 246, 0.25)',
        }}
      >
        {/* Subtle Cyber Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Animated Horizontal Scanline */}
        <div
          className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none -z-0"
          style={{
            animation: 'scanbeam 6s ease-in-out infinite alternate',
          }}
        />

        {/* Radial Depth Lighting from center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── Top System Header Bar ────────────────────────────────────────── */}
        <div className="relative z-10 px-5 sm:px-6 py-3 border-b border-blue-500/20 bg-[#0A101F]/80 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-cyan-400">
              LIVE ANALYSIS
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 ml-1">
              // TELEMETRY ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              SYSTEM READY
            </span>
          </div>
        </div>

        {/* ── Interactive Visualization Canvas / Node Stage ───────────────── */}
        <div className="relative z-10 p-5 sm:p-7 min-h-[350px] sm:min-h-[390px] flex flex-col justify-between">
          
          {/* Animated SVG Data Connection Pipelines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="claimToCoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="evidenceToCoreGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="coreToSignalsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
              </linearGradient>

              <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Path 1: Claim Node (Left) -> Central Core */}
            <path
              d="M 28 35 C 38 35, 42 35, 50 35"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="0.8"
              strokeDasharray="1.5 1.5"
            />
            {/* Pulsing Data Packet 1 */}
            <circle r="1.2" fill="#22D3EE" filter="url(#packetGlow)">
              <animateMotion
                path="M 28 35 C 38 35, 42 35, 50 35"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Path 2: Evidence Node (Right) -> Central Core */}
            <path
              d="M 72 35 C 62 35, 58 35, 50 35"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="0.8"
              strokeDasharray="1.5 1.5"
            />
            {/* Pulsing Data Packet 2 */}
            <circle r="1.2" fill="#38BDF8" filter="url(#packetGlow)">
              <animateMotion
                path="M 72 35 C 62 35, 58 35, 50 35"
                dur="2.8s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Path 3: Central Core -> Signals Node (Bottom) */}
            <path
              d="M 50 50 C 50 56, 50 60, 50 68"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="0.8"
              strokeDasharray="1.5 1.5"
            />
            {/* Pulsing Data Packet 3 */}
            <circle r="1.2" fill="#818CF8" filter="url(#packetGlow)">
              <animateMotion
                path="M 50 50 C 50 56, 50 60, 50 68"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>

          {/* Node Grid Layout */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 items-center pt-2">
            
            {/* ── Node 1: CLAIM Extracted (Left) ─────────────────────────── */}
            <div
              onMouseEnter={() => setActiveNode('claim')}
              onMouseLeave={() => setActiveNode(null)}
              className={`group flex flex-col items-center justify-center text-center p-3 sm:p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                activeNode === 'claim'
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-105'
                  : 'border-blue-500/25 bg-[#0C1529]/80 hover:border-cyan-400/50 hover:bg-[#0E1A33]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-1.5 shadow-inner group-hover:scale-110 transition-transform">
                <FileTextIcon size={18} />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                CLAIM
              </span>
              <span className="text-xs sm:text-sm font-black font-display text-white tracking-tight">
                Extracted
              </span>
              <div className="mt-1.5 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-[9px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>N-Gram NLP</span>
              </div>
            </div>

            {/* ── Node 2: TRUTHLENS Assessment Core (Center) ─────────────── */}
            <div
              onMouseEnter={() => setActiveNode('core')}
              onMouseLeave={() => setActiveNode(null)}
              className={`relative flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                activeNode === 'core'
                  ? 'border-blue-400 bg-gradient-to-b from-[#112248] to-[#0A1633] shadow-[0_0_35px_rgba(59,130,246,0.5)] scale-105'
                  : 'border-blue-500/50 bg-gradient-to-b from-[#0E1B38] to-[#081024] shadow-[0_0_25px_rgba(59,130,246,0.25)]'
              }`}
            >
              {/* Concentric subtle radar pulse ring around core */}
              <div className="absolute -inset-1.5 rounded-2xl border border-blue-400/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />

              {/* Core Glowing Shield */}
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center text-white mb-1.5 shadow-lg shadow-blue-500/40 border border-white/30">
                <ShieldIcon size={22} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </span>
              </div>

              <span className="text-[10px] font-mono font-black tracking-widest text-blue-400 uppercase">
                TRUTHLENS
              </span>
              <span className="text-xs sm:text-sm font-black font-display text-white tracking-tight">
                Assessment Core
              </span>

              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-[10px] font-mono font-bold text-cyan-300 shadow-xs">
                <span>Confidence:</span>
                <span className="text-emerald-400 font-extrabold">{claimProgress}%</span>
              </div>
            </div>

            {/* ── Node 3: EVIDENCE Retrieval (Right) ───────────────────────── */}
            <div
              onMouseEnter={() => setActiveNode('evidence')}
              onMouseLeave={() => setActiveNode(null)}
              className={`group flex flex-col items-center justify-center text-center p-3 sm:p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                activeNode === 'evidence'
                  ? 'border-sky-400 bg-sky-950/40 shadow-[0_0_20px_rgba(56,189,248,0.35)] scale-105'
                  : 'border-blue-500/25 bg-[#0C1529]/80 hover:border-sky-400/50 hover:bg-[#0E1A33]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-1.5 shadow-inner group-hover:scale-110 transition-transform">
                <GlobeIcon size={18} />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                EVIDENCE
              </span>
              <span className="text-xs sm:text-sm font-black font-display text-white tracking-tight">
                Retrieval
              </span>
              <div className="mt-1.5 flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/20 text-[9px] font-mono text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>14 Sources</span>
              </div>
            </div>

          </div>

          {/* ── Node 4: SIGNALS Measured (Bottom) ───────────────────────── */}
          <div className="relative z-10 flex justify-center mt-5">
            <div
              onMouseEnter={() => setActiveNode('signals')}
              onMouseLeave={() => setActiveNode(null)}
              className={`w-full max-w-sm flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                activeNode === 'signals'
                  ? 'border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.35)] scale-102'
                  : 'border-blue-500/25 bg-[#0C1529]/90 hover:border-indigo-400/50 hover:bg-[#0E1A33]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <BarChart2Icon size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                    SIGNALS
                  </span>
                  <span className="text-xs sm:text-sm font-black font-display text-white">
                    Measured (12 NLP Dimensions)
                  </span>
                </div>
              </div>

              {/* Dynamic Waveform / Equalizer Bars */}
              <div className="flex items-end gap-1 h-6 px-1.5">
                {signalBars.map((val, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ height: `${(val / 100) * 22}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Contextual Tooltip Overlay on Node Hover ────────────────── */}
          {activeNode && (
            <div className="mt-3 p-2.5 rounded-xl bg-[#090F1E]/95 border border-blue-500/40 text-center animate-in fade-in zoom-in-95 duration-200 shadow-xl">
              <p className="text-[11px] font-mono text-cyan-300">
                {activeNode === 'claim' && '⚡ Entity Extraction: Parsing key factual claims and linguistic tokens from input text.'}
                {activeNode === 'core' && '🛡️ Neural Assessment: Multi-model ensemble synthesizing gradient boosting and SHAP attribution.'}
                {activeNode === 'evidence' && '🌐 Corroboration Engine: Querying institutional records and verified fact-checking databases.'}
                {activeNode === 'signals' && '📊 Feature Extraction: Sensationalism density, passive voice ratio, and emotional tone scoring.'}
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom Operational Status Bar ───────────────────────────────── */}
        <div className="relative z-10 px-5 sm:px-6 py-2.5 border-t border-blue-500/20 bg-[#070D1A]/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">ASSESSMENT STATUS:</span>
            <span className="text-white font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              READY FOR INPUT
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
            <span>LATENCY: &lt;1.8s</span>
            <span>·</span>
            <span>MODEL: ENSEMBLE-V4</span>
          </div>
        </div>

      </div>
    </div>
  )
}
