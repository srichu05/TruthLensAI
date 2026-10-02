import { useState } from 'react'
import { Page, User } from '../App'
import {
  UserIcon, ShieldIcon, BellIcon, LockIcon, CheckIcon, ArrowRightIcon,
  LogoutIcon, TrendingUpIcon, CheckCircleIcon, AlertTriangle, InfoIcon, EditIcon,
  SunIcon, MoonIcon, MonitorIcon
} from '../components/Icons'
import { useTheme, ThemeMode } from '../utils/theme'

interface Props {
  navigate: (page: Page) => void
  user: User | null
  initialSection?: Section
}

const STATS = [
  { label: 'Total Analyses',  value: '24', Icon: TrendingUpIcon,  color: 'text-primary',   bg: 'bg-primary/10' },
  { label: 'True / Real News', value: '15', Icon: CheckCircleIcon, color: 'text-real',       bg: 'bg-real-bg' },
  { label: 'Fake News',       value: '9',  Icon: AlertTriangle,   color: 'text-fake',       bg: 'bg-fake-bg' },
]


type Section = 'account' | 'appearance' | 'security' | 'notifications'

export default function Profile({ navigate, user, initialSection = 'account' }: Props) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [editMode, setEditMode] = useState(false)
  const [name, setName]         = useState(user?.name  || 'Demo User')
  const [email, setEmail]       = useState(user?.email || 'demo@truthlens.ai')
  const [saved, setSaved]       = useState(false)

  const [notifs, setNotifs] = useState({
    weeklyDigest:  true,
    newFeatures:   true,
    analysisAlerts:false,
    marketing:     false,
  })

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TL'

  const handleSave = () => {
    setSaved(true)
    setEditMode(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const SIDEBAR_ITEMS: { id: Section; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'account',       label: 'Account',       Icon: UserIcon },
    { id: 'appearance',    label: 'Appearance',    Icon: SunIcon },
    { id: 'security',      label: 'Security',      Icon: LockIcon },
    { id: 'notifications', label: 'Notifications', Icon: BellIcon },
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto page-fade" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Identity & Engine Preferences</span>
        </div>
        <h1 className="text-3xl font-black text-foreground font-display tracking-tight mb-1">Profile & System Settings</h1>
        <p className="text-xs text-muted-foreground font-mono">Manage operator credentials, telemetry subscriptions, and display themes.</p>
      </div>

      {/* Profile card */}
      <div className="bg-card/80 border border-border rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md shadow-primary/20">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground font-display">{name}</h2>
          <p className="text-xs font-mono text-muted-foreground">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 bg-real-bg text-real border border-real-border px-3 py-0.5 rounded-full text-[11px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-real" /> Verified Operator
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">TruthLens AI Tier 1</span>
          </div>
        </div>
        <button
          onClick={() => { setActiveSection('account'); setEditMode(true) }}
          className="flex items-center gap-2 border border-border bg-card/60 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-all flex-shrink-0"
        >
          <EditIcon size={14} /> Edit Identity
        </button>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-card/80 border border-border rounded-2xl p-5 shadow-xs backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Settings layout */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="md:w-48 flex md:flex-col gap-2 flex-shrink-0">
          {SIDEBAR_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveSection(id); setEditMode(false) }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all text-left ${
                activeSection === id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="flex-1 bg-card/80 border border-border rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
          {/* Account */}
          {activeSection === 'account' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-foreground font-display">Account Credentials</h3>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} className="text-xs text-primary font-mono font-bold uppercase tracking-wider hover:underline">
                    Edit
                  </button>
                )}
              </div>

              {saved && (
                <div className="flex items-center gap-2 bg-real-bg border border-real-border text-real px-4 py-2.5 rounded-xl text-xs font-mono mb-4">
                  <CheckIcon size={14} /> Credentials updated successfully.
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Full Name</label>
                  {editMode ? (
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-mono text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  ) : (
                    <p className="text-xs font-mono text-foreground px-4 py-2.5 bg-background/50 border border-border/60 rounded-xl">{name}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Email Address</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-mono text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  ) : (
                    <p className="text-xs font-mono text-foreground px-4 py-2.5 bg-background/50 border border-border/60 rounded-xl">{email}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Engine Tier</label>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-background/50 border border-border/60 rounded-xl">
                    <p className="text-xs font-mono text-foreground font-semibold">Enterprise Forensic Intelligence</p>
                    <span className="text-[10px] font-mono text-primary font-bold uppercase">Active</span>
                  </div>
                </div>
              </div>

              {editMode && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 border border-border py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-border/80">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fake mb-3">Decommission Account</h4>
                <button className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-fake hover:bg-fake-bg border border-fake-border px-4 py-2.5 rounded-xl transition-all">
                  Purge Identity & Data
                </button>
              </div>
            </div>
          )}

          {/* Appearance / Theme Settings */}
          {activeSection === 'appearance' && (
            <div className="p-6">
              <h3 className="font-bold text-foreground font-display mb-1 text-base">Display & Theme Configuration</h3>
              <p className="text-xs text-muted-foreground font-mono mb-6">
                Tailor UI illumination. Setting persists immediately in local storage.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {/* Light Mode Option */}
                <div
                  onClick={() => setTheme('light')}
                  className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40 bg-secondary/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <SunIcon size={22} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'light'}
                      onChange={() => setTheme('light')}
                      className="accent-primary"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">Light</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                    High contrast crisp daylight background
                  </p>
                </div>

                {/* Dark Mode Option */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/40 bg-secondary/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <MoonIcon size={22} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'dark'}
                      onChange={() => setTheme('dark')}
                      className="accent-primary"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">Dark Navy</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                    Deep cyber navy with electric cyan luminescence
                  </p>
                </div>

                {/* System Default Option */}
                <div
                  onClick={() => setTheme('system')}
                  className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center text-center ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40 bg-secondary/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center mb-3">
                    <MonitorIcon size={22} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'system'}
                      onChange={() => setTheme('system')}
                      className="accent-primary"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">System Sync</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                    Synchronize automatically with OS settings
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Active Telemetry Mode:</span>
                <span className="font-bold text-primary uppercase tracking-wider">
                  {resolvedTheme} mode ({theme === 'system' ? 'System Sync' : 'Static Preference'})
                </span>
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="p-6">
              <h3 className="font-bold text-foreground font-display mb-6">Security & Authentication</h3>

              <div className="space-y-4">
                {[
                  { label: 'Access Credential',         desc: 'Update your account secret token',                     action: 'Rotate' },
                  { label: 'Multi-Factor Verification', desc: 'Hardware key / TOTP 2FA configuration',               action: 'Configure' },
                  { label: 'Active Terminals',          desc: '1 active terminal session (this machine)',            action: 'Inspect' },
                  { label: 'Forensic API Key',          desc: 'tl_live_••••••••••••••••••98a2',                      action: 'Reveal' },
                ].map(({ label, desc, action }) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-5 py-4 bg-background/50 border border-border/60 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-foreground uppercase">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary hover:underline flex-shrink-0 uppercase">
                      {action} <ArrowRightIcon size={11} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                <LockIcon size={14} className="text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground font-mono">End-to-end cryptographic integrity maintained across all inference payloads.</p>
              </div>

              <button
                onClick={() => navigate('landing')}
                className="flex items-center gap-2 mt-4 text-xs font-mono font-bold uppercase tracking-wider text-fake hover:bg-fake-bg border border-fake-border px-4 py-2.5 rounded-xl transition-all"
              >
                <LogoutIcon size={15} /> Terminate All Active Sessions
              </button>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div className="p-6">
              <h3 className="font-bold text-foreground font-display mb-2">Telemetry & Notification Dispatch</h3>
              <p className="text-xs text-muted-foreground font-mono mb-6">Select telemetry alerts dispatched to your registered endpoint.</p>

              <div className="space-y-3">
                {(Object.entries(notifs) as [keyof typeof notifs, boolean][]).map(([key, value]) => {
                  const labels: Record<keyof typeof notifs, { label: string; desc: string }> = {
                    weeklyDigest:  { label: 'Intelligence Summary', desc: 'Aggregated breakdown of indexed claims weekly.' },
                    newFeatures:   { label: 'Pipeline Deployments', desc: 'Updates to neural heuristics and transformer weights.' },
                    analysisAlerts:{ label: 'Async Batch Alerts',   desc: 'Notify when large document batch verifies.' },
                    marketing:     { label: 'Security Advisories',  desc: 'Notices regarding misinformation attack vectors.' },
                  }
                  const { label, desc } = labels[key]
                  return (
                    <div key={key} className="flex items-start justify-between gap-4 px-5 py-4 bg-background/50 border border-border/60 rounded-xl">
                      <div>
                        <p className="text-xs font-mono font-bold text-foreground uppercase">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                        className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 mt-0.5 ${value ? 'bg-primary' : 'bg-border'}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button className="mt-6 bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-primary-hover transition-all shadow-md shadow-primary/20">
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate('landing')}
          className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-fake transition-colors"
        >
          <LogoutIcon size={15} /> End Session
        </button>
      </div>
    </div>
  )
}
