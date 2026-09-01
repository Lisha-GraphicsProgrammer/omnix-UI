import { createContext, useContext, useState, ReactNode } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  mode: ThemeMode
  toggleMode: () => void
  t: {
    bg: string
    bgSecondary: string
    surface: string
    surfaceHover: string
    border: string
    borderStrong: string
    text: string
    textSecondary: string
    textMuted: string
    sidebarBg: string
    sidebarText: string
    sidebarTextMuted: string
    sidebarBorder: string
    topbarBg: string
  }
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark')

  // ── Dark teal-green base — third and final pass, replacing the navy+
  // yellow attempt with the confirmed teal-green + white direction. ──
  const dark = {
    bg: '#0D1A1B',
    bgSecondary: '#132A2C',
    surface: 'rgba(220,245,240,0.04)',
    surfaceHover: 'rgba(220,245,240,0.07)',
    border: 'rgba(58,175,169,0.12)',
    borderStrong: 'rgba(58,175,169,0.24)',
    text: '#F0FBFA',
    textSecondary: 'rgba(240,251,250,0.62)',
    textMuted: 'rgba(240,251,250,0.30)',
    sidebarBg: '#0A1618',
    sidebarText: '#F0FBFA',
    sidebarTextMuted: 'rgba(240,251,250,0.30)',
    sidebarBorder: 'rgba(58,175,169,0.10)',
    topbarBg: 'rgba(10,22,24,0.96)',
  }

  // ── Light mode — soft mint-white base, deep teal text ──
  const light = {
    bg: '#E9F5F4',
    bgSecondary: '#F6FBFA',
    surface: 'rgba(255,255,255,0.68)',
    surfaceHover: 'rgba(255,255,255,0.88)',
    border: 'rgba(23,37,42,0.14)',
    borderStrong: 'rgba(23,37,42,0.28)',
    text: '#17252A',
    textSecondary: 'rgba(23,37,42,0.68)',
    textMuted: 'rgba(23,37,42,0.44)',
    sidebarBg: '#DCF0EE',
    sidebarText: '#17252A',
    sidebarTextMuted: 'rgba(23,37,42,0.62)',
    sidebarBorder: 'rgba(23,37,42,0.18)',
    topbarBg: 'rgba(233,245,244,0.97)',
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, t: mode === 'dark' ? dark : light }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}