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
    topbarBg: string
  }
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark')

  const dark = {
    bg: '#08080a',
    bgSecondary: '#0d0d10',
    surface: 'rgba(255,255,255,0.03)',
    surfaceHover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.28)',
    sidebarBg: '#0d0d10',
    topbarBg: 'rgba(13,13,16,0.95)',
  }

  // ── Softer, more professional light theme ──
  const light = {
    bg: '#f4f5f7',           // warm grey — not pure white
    bgSecondary: '#ffffff',
    surface: 'rgba(0,0,0,0.03)',
    surfaceHover: 'rgba(0,0,0,0.055)',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.15)',
    text: '#1a1a2e',         // dark navy — softer than pure black
    textSecondary: 'rgba(26,26,46,0.65)',
    textMuted: 'rgba(26,26,46,0.38)',
    sidebarBg: '#ffffff',
    topbarBg: 'rgba(255,255,255,0.92)',
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