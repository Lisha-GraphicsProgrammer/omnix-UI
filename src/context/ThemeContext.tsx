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
    // ── Mode-aware accent — navy needs to be lighter in dark mode to
    // stay readable against a near-black background. Gold is punchy in
    // light mode (where a bright background softens the contrast) and
    // muted in dark mode (where the same brightness would be straining). ──
    accent: string
    accentHover: string
    gold: string
    goldBg: string
    goldText: string
  }
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark')

  const dark = {
    bg: '#14161C',
    bgSecondary: '#1B1E27',
    surface: 'rgba(235,240,250,0.04)',
    surfaceHover: 'rgba(235,240,250,0.07)',
    border: 'rgba(120,140,180,0.14)',
    borderStrong: 'rgba(120,140,180,0.24)',
    text: '#EDEFF3',
    textSecondary: '#A9ABD1',
    textMuted: '#6E7280',
    sidebarBg: '#1B1E27',
    sidebarText: '#EDEFF3',
    sidebarTextMuted: '#6E7280',
    sidebarBorder: 'rgba(120,140,180,0.14)',
    topbarBg: 'rgba(20,22,28,0.96)',
    // Lightened navy — the raw #173e76 is too dark to read against this
    // near-black background, same fix as the bronze/gold accents earlier.
    accent: '#4A79B8',
    accentHover: '#5B87C4',
    gold: '#D9A544',
    goldBg: '#3D330F',
    goldText: '#D9A544',
  }

  // ── Locked palette: navy #173e76 + gold. Light mode is deliberately
  // richer (soft warm gradient undercurrent, punchy gold accents) since
  // color sits more comfortably against a bright background — dark mode
  // stays quiet on purpose, since that's when the eye wants the least
  // visual noise, especially over a long monitoring session. ──
  const light = {
    bg: 'linear-gradient(160deg, #FFFFFF 0%, #FBF6EA 100%)',
    bgSecondary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHover: 'rgba(23,62,118,0.04)',
    border: '#EAEAE5',
    borderStrong: '#D8DCE3',
    text: '#1E2126',
    textSecondary: '#5A5C6E',
    textMuted: '#9B9B93',
    sidebarBg: '#FFFFFF',
    sidebarText: '#1E2126',
    sidebarTextMuted: '#9B9B93',
    sidebarBorder: '#EAEAE5',
    topbarBg: 'rgba(250,250,248,0.97)',
    accent: '#173e76',
    accentHover: '#1F4E90',
    gold: '#F2B705',
    goldBg: '#FBF1DC',
    goldText: '#8A6A1E',
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
