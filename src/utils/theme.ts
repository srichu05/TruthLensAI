import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'truthlens_theme'

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark'
}

export function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'

  let effective: 'light' | 'dark' = 'dark'
  if (mode === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    effective = mode
  }

  const root = document.documentElement
  if (effective === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }

  return effective
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const stored = getStoredTheme()
    if (typeof window === 'undefined') return 'dark'
    if (stored === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return stored
  })

  useEffect(() => {
    const effective = applyTheme(theme)
    setResolvedTheme(effective)
    localStorage.setItem(STORAGE_KEY, theme)

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent) => {
        const eff = e.matches ? 'dark' : 'light'
        applyTheme('system')
        setResolvedTheme(eff)
      }
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode)
  }

  return { theme, resolvedTheme, setTheme }
}
