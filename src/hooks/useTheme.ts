import { useEffect } from 'react'
import { create } from 'zustand'

type Theme = 'light' | 'dark'
const THEME_KEY = 'fv.theme'

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitial(),
  toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
  set: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
}))

/** Aplica la clase .dark al <html> según el store. Montar una vez en providers. */
export function useApplyTheme(): void {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
