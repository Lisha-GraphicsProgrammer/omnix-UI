import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SecurityIcon from '@mui/icons-material/Security'
import GroupsIcon from '@mui/icons-material/Groups'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BarChartIcon from '@mui/icons-material/BarChart'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import EditNoteIcon from '@mui/icons-material/EditNote'
import PsychologyIcon from '@mui/icons-material/Psychology'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import RuleIcon from '@mui/icons-material/Rule'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LogoutIcon from '@mui/icons-material/Logout'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { useTheme } from './ThemeContext'

const CYAN   = '#00D4FF'
const PURPLE = '#7C3AED'
const GREEN  = '#00E676'
const AMBER  = '#FFB300'
const DRAWER_OPEN = 220
const DRAWER_CLOSED = 56

const suggestions = [
  { icon: <SecurityIcon sx={{ fontSize: 16 }} />,     iconColor: AMBER,     text: 'Alert when worker without helmet enters loading zone', tag: 'PPE Safety',    tagColor: AMBER },
  { icon: <GroupsIcon sx={{ fontSize: 16 }} />,       iconColor: CYAN,      text: 'Alert if more than 5 people are in the restricted area', tag: 'Crowd Control', tagColor: CYAN },
  { icon: <WarningAmberIcon sx={{ fontSize: 16 }} />, iconColor: '#FF4444', text: 'Alert when forklift comes within 5 meters of a worker', tag: 'Proximity',    tagColor: '#FF4444' },
  { icon: <BarChartIcon sx={{ fontSize: 16 }} />,     iconColor: GREEN,     text: 'Alert if worker count exceeds 10 in warehouse zone', tag: 'Count Logic',   tagColor: GREEN },
]

const mockHistory = [
  { id: 1, instruction: 'Alert when worker without helmet enters loading zone', status: 'active', time: '14:32', pipeline: 'YOLOv8 + ByteTrack + Zone Logic', alerts: 7 },
  { id: 2, instruction: 'Alert if forklift detected near crane operator',        status: 'active', time: '13:15', pipeline: 'YOLOv8 + Proximity Detection',    alerts: 2 },
  { id: 3, instruction: 'Alert when more than 5 people in gate area',            status: 'active', time: '11:40', pipeline: 'YOLOv8 + Person Count',            alerts: 0 },
]

const howItWorks = [
  { n: '01', icon: <EditNoteIcon sx={{ fontSize: 14 }} />,     text: 'Type your instruction in plain English', color: '#818cf8' },
  { n: '02', icon: <PsychologyIcon sx={{ fontSize: 14 }} />,   text: 'AI extracts intent, objects & logic',    color: '#a78bfa' },
  { n: '03', icon: <AccountTreeIcon sx={{ fontSize: 14 }} />,  text: 'OMNIX generates JSON pipeline config',   color: CYAN },
  { n: '04', icon: <RocketLaunchIcon sx={{ fontSize: 14 }} />, text: 'Review, then deploy with one click',     color: GREEN },
]

const navItems = [
  { text: 'Cameras',         icon: <CameraAltIcon sx={{ fontSize: 18 }} />,    path: '/dashboard' },
  { text: 'Rules',           icon: <RuleIcon sx={{ fontSize: 18 }} />,         path: '/rules'     },
  { text: 'Alert Dashboard', icon: <DashboardIcon sx={{ fontSize: 18 }} />,    path: '/dashboard' },
  { text: 'Settings',        icon: <SettingsIcon sx={{ fontSize: 18 }} />,     path: '/dashboard' },
]

export default function Rules() {
  const [instruction, setInstruction] = useState('')
  const [history, setHistory]         = useState(mockHistory)
  const [processing, setProcessing]   = useState(false)
  const [lastSent, setLastSent]       = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const navigate = useNavigate()
  const { t, mode, toggleMode } = useTheme()

  const drawerWidth = sidebarOpen ? DRAWER_OPEN : DRAWER_CLOSED

  const handleSend = () => {
    if (!instruction.trim()) return
    setProcessing(true); setLastSent(instruction)
    setTimeout(() => {
      setHistory(prev => [{ id: prev.length + 1, instruction, status: 'active', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), pipeline: 'YOLOv8 + ByteTrack + Zone Logic', alerts: 0 }, ...prev])
      setInstruction(''); setProcessing(false)
    }, 1800)
  }

  const handleSignOut = () => { localStorage.removeItem('omnix_auth'); navigate('/login') }
  const canSend = !!instruction.trim() && !processing

  return (
    <Box sx={{ height: '100vh', display: 'flex', background: t.bg, fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <Box sx={{ width: drawerWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', background: t.sidebarBg, borderRight: `1px solid ${t.border}`, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, transition: 'width .25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}>
        {/* Logo */}
        <Box sx={{ px: sidebarOpen ? 3 : 1.5, py: 3, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 72 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.4)', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/><circle cx="12" cy="12" r="3.5" fill="white"/><circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1"/></svg>
          </Box>
          {sidebarOpen && <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: t.text, fontWeight: 700, fontSize: '.95rem', lineHeight: 1 }}>OMNIX</Typography>
            <Typography sx={{ color: t.textMuted, fontSize: '.58rem', letterSpacing: '.06em' }}>ENTERPRISE</Typography>
          </Box>}
          <IconButton size="small" onClick={() => setSidebarOpen(o => !o)} sx={{ color: t.textMuted, ml: sidebarOpen ? 0 : '-4px', '&:hover': { color: t.text } }}>
            {sidebarOpen ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, py: 2, overflowX: 'hidden' }}>
          {sidebarOpen && <Typography sx={{ color: t.textMuted, fontSize: '.6rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', px: 3, mb: 1, opacity: .6 }}>Navigation</Typography>}
          {navItems.map(item => {
            const isSel = item.text === 'Rules'
            return (
              <Tooltip key={item.text} title={!sidebarOpen ? item.text : ''} placement="right">
                <Box onClick={() => { if (item.text !== 'Rules') navigate(item.path) }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: sidebarOpen ? 3 : 1.5, py: 1.4, mx: 1, mb: .5, borderRadius: '10px', cursor: 'pointer', position: 'relative', background: isSel ? 'rgba(99,102,241,0.12)' : 'transparent', border: isSel ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent', transition: 'all .2s', '&:hover': { background: isSel ? 'rgba(99,102,241,0.12)' : t.surfaceHover } }}>
                  {isSel && <Box sx={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: 3, borderRadius: '0 3px 3px 0', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />}
                  <Box sx={{ color: isSel ? '#818cf8' : t.textMuted, display: 'flex', flexShrink: 0 }}>{item.icon}</Box>
                  {sidebarOpen && <Typography sx={{ color: isSel ? t.text : t.textSecondary, fontSize: '.85rem', fontWeight: isSel ? 600 : 400, whiteSpace: 'nowrap' }}>{item.text}</Typography>}
                </Box>
              </Tooltip>
            )
          })}
        </Box>

        {/* User */}
        <Box sx={{ p: sidebarOpen ? 2 : 1, borderTop: `1px solid ${t.border}` }}>
          {sidebarOpen ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '10px 12px', borderRadius: '10px', background: t.surface, border: `1px solid ${t.border}`, mb: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ color: '#fff', fontSize: '.72rem', fontWeight: 700 }}>A</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: t.text, fontSize: '.78rem', fontWeight: 600, lineHeight: 1 }}>Admin</Typography>
                  <Typography sx={{ color: t.textMuted, fontSize: '.65rem', mt: .2 }} noWrap>admin@omnix.ai</Typography>
                </Box>
              </Box>
              <Box onClick={() => setSignOutOpen(true)} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: '8px', cursor: 'pointer', '&:hover': { background: t.surfaceHover }, transition: 'all .2s' }}>
                <LogoutIcon sx={{ color: t.textMuted, fontSize: 15 }} />
                <Typography sx={{ color: t.textMuted, fontSize: '.75rem' }}>Sign out</Typography>
              </Box>
            </>
          ) : (
            <Tooltip title="Sign out" placement="right">
              <Box onClick={() => setSignOutOpen(true)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, borderRadius: '8px', cursor: 'pointer', '&:hover': { background: t.surfaceHover } }}>
                <LogoutIcon sx={{ color: t.textMuted, fontSize: 18 }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* ── MAIN AREA ── */}
      <Box sx={{ flex: 1, ml: `${drawerWidth}px`, display: 'flex', flexDirection: 'column', transition: 'margin-left .25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', height: '100vh' }}>

        {/* Top bar */}
        <Box sx={{ px: 4, height: 64, flexShrink: 0, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 2, background: t.topbarBg, backdropFilter: 'blur(20px)', zIndex: 50, boxShadow: `0 -1px 0 0 ${PURPLE}50 inset` }}>
          <Box sx={{ width: '1px', height: 20, background: t.border, flexShrink: 0 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(99,102,241,0.4)', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/><circle cx="12" cy="12" r="3.5" fill="white"/><circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1"/></svg>
            </Box>
            <Typography sx={{ color: t.text, fontWeight: 700, fontSize: '.92rem', letterSpacing: '-.2px' }}>OMNIX</Typography>
            <Box sx={{ width: '1px', height: 16, background: t.border, flexShrink: 0 }} />
            <Typography sx={{ color: t.textMuted, fontSize: '.82rem' }}>Rule Creation</Typography>
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
              <IconButton onClick={toggleMode} size="small" sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, '&:hover': { color: t.text } }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'p 2s infinite', '@keyframes p': { '0%,100%': { opacity: 1 }, '50%': { opacity: .3 } } }} />
              <Typography sx={{ color: t.textMuted, fontSize: '.72rem' }}>AI Engine Online</Typography>
            </Box>
            <Box sx={{ px: 1.5, py: .4, borderRadius: '6px', background: `${GREEN}10`, border: `1px solid ${GREEN}25` }}>
              <Typography sx={{ color: GREEN, fontSize: '.6rem', fontWeight: 800, letterSpacing: '.08em' }}>LIVE</Typography>
            </Box>
          </Box>
        </Box>

        {/* Two-panel content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT */}
          <Box sx={{ flex: 1, overflowY: 'auto', borderRight: `1px solid ${t.border}`, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: `${PURPLE}35`, borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: `${PURPLE}60` } }}>
            <Box sx={{ p: '40px 48px' }}>
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: .6, borderRadius: '20px', mb: 2.5, background: `${PURPLE}15`, border: `1px solid ${PURPLE}40`, boxShadow: `0 0 16px ${PURPLE}20` }}>
                  <AutoFixHighIcon sx={{ fontSize: 12, color: '#a5b4fc' }} />
                  <Typography sx={{ color: '#a5b4fc', fontSize: '.7rem', fontWeight: 600, letterSpacing: '.04em' }}>Powered by OMNIX AI Engine</Typography>
                </Box>
                <Typography sx={{ color: t.text, fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1.1, mb: 1.5 }}>Create Detection Rule</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: '.9rem', lineHeight: 1.7, maxWidth: 480 }}>
                  Type a plain English instruction. OMNIX converts it into a production-grade YOLOv8 + ByteTrack computer vision pipeline automatically.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography sx={{ color: t.textMuted, fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.12em', mb: 2 }}>Quick examples — click to use</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {suggestions.map((s, i) => (
                    <Box key={i} onClick={() => setInstruction(s.text)} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: '14px 16px', borderRadius: '14px', background: t.surface, border: `1px solid ${t.border}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${s.iconColor}60, transparent)`, opacity: 0, transition: 'opacity .2s' }, '&:hover': { background: `${s.iconColor}08`, borderColor: `${s.iconColor}30`, transform: 'translateY(-2px)', '&::before': { opacity: 1 } } }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: `${s.iconColor}18`, border: `1px solid ${s.iconColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.iconColor }}>{s.icon}</Box>
                      <Box>
                        <Box sx={{ display: 'inline-flex', px: 1, py: .2, borderRadius: '5px', background: `${s.tagColor}15`, border: `1px solid ${s.tagColor}30`, mb: .7 }}>
                          <Typography sx={{ color: s.tagColor, fontSize: '.6rem', fontWeight: 700 }}>{s.tag}</Typography>
                        </Box>
                        <Typography sx={{ color: t.textSecondary, fontSize: '.8rem', lineHeight: 1.5 }}>{s.text}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ borderRadius: '16px', background: t.surface, border: `1px solid ${instruction ? `${PURPLE}40` : t.border}`, overflow: 'hidden', transition: 'all .25s', boxShadow: instruction ? `0 0 0 4px ${PURPLE}10` : 'none' }}>
                <textarea value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="e.g. Alert me when a worker without a helmet enters the loading zone..." rows={5}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: t.text, fontSize: '0.92rem', lineHeight: 1.75, padding: '20px 20px 12px', fontFamily: '"Inter", system-ui, sans-serif' }} />
                <style>{`textarea::placeholder { color: ${t.textMuted}; }`}</style>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: `1px solid ${t.border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ color: t.textMuted, fontSize: '.7rem', opacity: .5 }}>↵ Enter to send</Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: '.7rem', opacity: .3 }}>⇧↵ New line</Typography>
                  </Box>
                  <Box onClick={canSend ? handleSend : undefined} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '18px', py: '9px', borderRadius: '10px', background: canSend ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)` : t.surface, border: `1px solid ${canSend ? PURPLE + '70' : t.border}`, cursor: canSend ? 'pointer' : 'default', boxShadow: canSend ? `0 4px 16px ${PURPLE}40` : 'none', transition: 'all .2s', '&:hover': canSend ? { transform: 'translateY(-1px)', boxShadow: `0 8px 24px ${PURPLE}50` } : {} }}>
                    {processing ? <Box sx={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'sp 1s linear infinite', '@keyframes sp': { '100%': { transform: 'rotate(360deg)' } } }} /> : <SendIcon sx={{ fontSize: 14, color: canSend ? '#fff' : t.textMuted }} />}
                    <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: canSend ? '#fff' : t.textMuted }}>{processing ? 'Building pipeline...' : 'Generate Rule'}</Typography>
                  </Box>
                </Box>
              </Box>

              {processing && (
                <Box sx={{ mt: 2.5, p: '16px 20px', borderRadius: '14px', background: `${PURPLE}10`, border: `1px solid ${PURPLE}30`, animation: 'fadeIn .3s ease', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: .5 }}>
                      {[0,1,2].map(d => <Box key={d} sx={{ width: 5, height: 5, borderRadius: '50%', background: '#a5b4fc', animation: `dot 1.2s ease ${d*.2}s infinite`, '@keyframes dot': { '0%,100%': { opacity: .2 }, '50%': { opacity: 1 } } }} />)}
                    </Box>
                    <Typography sx={{ color: '#a5b4fc', fontSize: '.8rem', fontWeight: 600 }}>OMNIX AI is analyzing your instruction...</Typography>
                  </Box>
                  <Box sx={{ p: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${t.border}` }}>
                    <Typography sx={{ color: t.textSecondary, fontSize: '.78rem', fontStyle: 'italic' }}>"{lastSent}"</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {['Extracting intent...', 'Identifying objects...', 'Building pipeline...'].map((tx, i) => (
                      <Box key={i} sx={{ px: 1.2, py: .4, borderRadius: '6px', background: `${PURPLE}15`, border: `1px solid ${PURPLE}30`, animation: `fi .4s ease ${i*.3}s both`, '@keyframes fi': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
                        <Typography sx={{ color: '#a5b4fc', fontSize: '.65rem' }}>{tx}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              <Box sx={{ height: 40 }} />
            </Box>
          </Box>

          {/* RIGHT */}
          <Box sx={{ width: 380, flexShrink: 0, overflowY: 'auto', background: t.surface, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: `${PURPLE}35`, borderRadius: '4px' }, '&::-webkit-scrollbar-thumb:hover': { background: `${PURPLE}60` } }}>
            <Box sx={{ p: '40px 28px' }}>
              <Box sx={{ borderRadius: '16px', overflow: 'hidden', mb: 3, background: t.bgSecondary, border: `1px solid ${t.border}` }}>
                <Box sx={{ px: 3, py: '16px', background: `linear-gradient(135deg, ${PURPLE}12 0%, transparent 60%)`, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ color: t.text, fontWeight: 700, fontSize: '.95rem' }}>Generated Rules</Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: '.72rem', mt: '.2rem' }}>Session history</Typography>
                  </Box>
                  <Box sx={{ px: 1.5, py: .4, borderRadius: '20px', background: `${GREEN}12`, border: `1px solid ${GREEN}25` }}>
                    <Typography sx={{ color: GREEN, fontSize: '.65rem', fontWeight: 700 }}>{history.length} rules</Typography>
                  </Box>
                </Box>
                <Box sx={{ p: '8px 12px 12px' }}>
                  {history.length === 0 ? (
                    <Box sx={{ p: '24px 16px', textAlign: 'center' }}>
                      <Typography sx={{ color: t.textMuted, fontSize: '.82rem' }}>No rules generated yet</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {history.map((item, i) => (
                        <Box key={item.id} sx={{ p: '14px 16px', borderRadius: '12px', background: i === 0 && !processing ? `${PURPLE}10` : t.surface, border: `1px solid ${i === 0 && !processing ? `${PURPLE}30` : t.border}`, transition: 'all .25s', '&:hover': { borderColor: `${PURPLE}25` } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .8 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: .7 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                              <Typography sx={{ color: GREEN, fontSize: '.62rem', fontWeight: 700, letterSpacing: '.05em' }}>ACTIVE</Typography>
                            </Box>
                            <Typography sx={{ color: t.textMuted, fontSize: '.65rem', fontFamily: 'monospace' }}>{item.time}</Typography>
                          </Box>
                          <Typography sx={{ color: t.textSecondary, fontSize: '.82rem', lineHeight: 1.55, mb: 1 }}>{item.instruction}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: .5 }}>
                            <Box sx={{ px: 1, py: .3, borderRadius: '5px', background: t.surface, border: `1px solid ${t.border}` }}>
                              <Typography sx={{ color: t.textMuted, fontSize: '.6rem', fontFamily: 'monospace' }}>{item.pipeline}</Typography>
                            </Box>
                            {item.alerts > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, px: 1, py: .3, borderRadius: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }} />
                                <Typography sx={{ color: '#fca5a5', fontSize: '.62rem', fontWeight: 600 }}>{item.alerts} alerts</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ borderRadius: '16px', overflow: 'hidden', background: t.bgSecondary, border: `1px solid ${t.border}` }}>
                <Box sx={{ px: 3, py: '16px', background: `linear-gradient(135deg, ${CYAN}10 0%, transparent 60%)`, borderBottom: `1px solid ${t.border}` }}>
                  <Typography sx={{ color: t.text, fontWeight: 700, fontSize: '.95rem' }}>How It Works</Typography>
                  <Typography sx={{ color: t.textMuted, fontSize: '.72rem', mt: '.2rem' }}>From words to pipeline in seconds</Typography>
                </Box>
                <Box sx={{ p: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: .5 }}>
                  {howItWorks.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: '10px 12px', borderRadius: '10px', transition: 'background .2s', '&:hover': { background: t.surfaceHover } }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: `${s.color}18`, border: `1px solid ${s.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color, position: 'relative' }}>
                        {s.icon}
                        <Box sx={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: t.bg, border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ color: s.color, fontSize: '.48rem', fontWeight: 800, lineHeight: 1 }}>{s.n}</Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ color: t.textSecondary, fontSize: '.8rem', lineHeight: 1.5 }}>{s.text}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ height: 40 }} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Sign out confirmation */}
      <Dialog open={signOutOpen} onClose={() => setSignOutOpen(false)} sx={{ '& .MuiDialog-paper': { background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: '16px', minWidth: 360 } }}>
        <DialogTitle sx={{ color: t.text, fontWeight: 700, fontSize: '1rem', pb: 1 }}>Sign out of OMNIX?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textSecondary, fontSize: '.88rem', lineHeight: 1.6 }}>You'll be returned to the login screen. Any unsaved settings will be lost.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setSignOutOpen(false)} sx={{ color: t.textSecondary, borderRadius: '9px', textTransform: 'none', border: `1px solid ${t.border}`, px: 2.5, '&:hover': { background: t.surfaceHover } }}>Cancel</Button>
          <Button onClick={handleSignOut} variant="contained" sx={{ borderRadius: '9px', textTransform: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', px: 2.5 }}>Sign Out</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}