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

  const dark = {
    bg: '#120e0c',
    bgSecondary: '#1a1412',
    surface: 'rgba(255,235,220,0.04)',
    surfaceHover: 'rgba(255,235,220,0.07)',
    border: 'rgba(255,200,170,0.08)',
    borderStrong: 'rgba(255,200,170,0.16)',
    text: '#F5F0EB',
    textSecondary: 'rgba(245,240,235,0.62)',
    textMuted: 'rgba(245,240,235,0.30)',
    sidebarBg: '#160f0d',
    sidebarText: '#F5F0EB',
    sidebarTextMuted: 'rgba(245,240,235,0.30)',
    sidebarBorder: 'rgba(255,200,170,0.08)',
    topbarBg: 'rgba(22,15,13,0.96)',
  }

  // ── Inspired by the room palette — greige + mauve + burgundy ──
 const light = {
    bg: '#C8BFBA',           
    bgSecondary: '#E8E0DC',  // much lighter — cards pop out clearly
    surface: 'rgba(255,255,255,0.55)',      // white-ish cards
    surfaceHover: 'rgba(255,255,255,0.75)',
    border: 'rgba(80,30,30,0.14)',
    borderStrong: 'rgba(80,30,30,0.28)',
    text: '#1E0E0E',         
    textSecondary: 'rgba(30,14,14,0.68)',
    textMuted: 'rgba(30,14,14,0.44)',
    sidebarBg: '#D9C7BE',      // soft dusty mauve — clearly distinct from the beige main bg, but still light and consistent with the rest of light mode
    sidebarText: '#1E0E0E',    // same as body text — guaranteed legible against a light sidebar, no separate dark-panel logic needed
    sidebarTextMuted: 'rgba(30,14,14,0.62)', // stronger than the standard textMuted so nav labels read clearly at a glance
    sidebarBorder: 'rgba(80,30,30,0.18)',
    topbarBg: 'rgba(200,191,186,0.97)',
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