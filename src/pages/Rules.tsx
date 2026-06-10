import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Tooltip } from '@mui/material'
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const CYAN   = '#00D4FF'
const PURPLE = '#7C3AED'
const GREEN  = '#00E676'
const AMBER  = '#FFB300'

const suggestions = [
  { icon: <SecurityIcon sx={{ fontSize: 16 }} />,     iconColor: AMBER,  text: 'Alert when worker without helmet enters loading zone', tag: 'PPE Safety',     tagColor: AMBER },
  { icon: <GroupsIcon sx={{ fontSize: 16 }} />,       iconColor: CYAN,   text: 'Alert if more than 5 people are in the restricted area', tag: 'Crowd Control', tagColor: CYAN },
  { icon: <WarningAmberIcon sx={{ fontSize: 16 }} />, iconColor: '#FF4444', text: 'Alert when forklift comes within 5 meters of a worker', tag: 'Proximity',   tagColor: '#FF4444' },
  { icon: <BarChartIcon sx={{ fontSize: 16 }} />,     iconColor: GREEN,  text: 'Alert if worker count exceeds 10 in warehouse zone', tag: 'Count Logic',      tagColor: GREEN },
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

export default function Rules() {
  const [instruction, setInstruction] = useState('')
  const [history, setHistory]         = useState(mockHistory)
  const [processing, setProcessing]   = useState(false)
  const [lastSent, setLastSent]       = useState('')
  const navigate = useNavigate()

  const handleSend = () => {
    if (!instruction.trim()) return
    setProcessing(true)
    setLastSent(instruction)
    setTimeout(() => {
      setHistory(prev => [{
        id: prev.length + 1,
        instruction,
        status: 'active',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pipeline: 'YOLOv8 + ByteTrack + Zone Logic',
        alerts: 0,
      }, ...prev])
      setInstruction('')
      setProcessing(false)
    }, 1800)
  }

  const canSend = !!instruction.trim() && !processing

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#08080a', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <Box sx={{
        px: 4, height: 64, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(13,13,16,0.95)', backdropFilter: 'blur(20px)', zIndex: 50,
        boxShadow: `0 -1px 0 0 ${PURPLE}50 inset, 0 1px 0 rgba(255,255,255,0.03)`,
      }}>
        <Box onClick={() => navigate('/dashboard')} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: .7, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', transition: 'all .2s', flexShrink: 0, '&:hover': { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' } }}>
          <ArrowBackIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '.78rem' }}>Dashboard</Typography>
        </Box>
        <Box sx={{ width: '1px', height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(99,102,241,0.4)', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.5" fill="white"/>
              <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1"/>
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '.92rem', letterSpacing: '-.2px' }}>OMNIX</Typography>
          <Box sx={{ width: '1px', height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '.82rem' }}>Rule Creation</Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'p 2s infinite', '@keyframes p': { '0%,100%': { opacity: 1 }, '50%': { opacity: .3 } } }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '.72rem' }}>AI Engine Online</Typography>
          </Box>
          <Box sx={{ px: 1.5, py: .4, borderRadius: '6px', background: `${GREEN}10`, border: `1px solid ${GREEN}25` }}>
            <Typography sx={{ color: GREEN, fontSize: '.6rem', fontWeight: 800, letterSpacing: '.08em' }}>LIVE</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── MAIN — two independent scroll panels ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT */}
        <Box sx={{
          flex: 1, overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: `${PURPLE}35`, borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: `${PURPLE}60` },
        }}>
          <Box sx={{ p: '40px 48px' }}>

            {/* Header */}
            <Box sx={{ mb: 5 }}>
              {/* Powered by badge — glowing */}
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                px: 1.5, py: .6, borderRadius: '20px', mb: 2.5,
                background: `${PURPLE}15`, border: `1px solid ${PURPLE}40`,
                boxShadow: `0 0 16px ${PURPLE}20`,
              }}>
                <AutoFixHighIcon sx={{ fontSize: 12, color: '#a5b4fc' }} />
                <Typography sx={{ color: '#a5b4fc', fontSize: '.7rem', fontWeight: 600, letterSpacing: '.04em' }}>Powered by OMNIX AI Engine</Typography>
              </Box>

              <Typography sx={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1.1, mb: 1.5 }}>
                Create Detection Rule
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.9rem', lineHeight: 1.7, maxWidth: 480 }}>
                Type a plain English instruction. OMNIX converts it into a production-grade YOLOv8 + ByteTrack computer vision pipeline automatically.
              </Typography>
            </Box>

            {/* Quick examples */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.18)', fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.12em', mb: 2 }}>
                Quick examples — click to use
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {suggestions.map((s, i) => (
                  <Box key={i} onClick={() => setInstruction(s.text)} sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    p: '14px 16px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', transition: 'all .2s',
                    position: 'relative', overflow: 'hidden',
                    '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${s.iconColor}60, transparent)`, opacity: 0, transition: 'opacity .2s' },
                    '&:hover': { background: `${s.iconColor}08`, borderColor: `${s.iconColor}30`, transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${s.iconColor}12`, '&::before': { opacity: 1 } },
                  }}>
                    {/* Icon circle */}
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: `${s.iconColor}18`, border: `1px solid ${s.iconColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.iconColor }}>
                      {s.icon}
                    </Box>
                    <Box>
                      <Box sx={{ display: 'inline-flex', px: 1, py: .2, borderRadius: '5px', background: `${s.tagColor}15`, border: `1px solid ${s.tagColor}30`, mb: .7 }}>
                        <Typography sx={{ color: s.tagColor, fontSize: '.6rem', fontWeight: 700 }}>{s.tag}</Typography>
                      </Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '.8rem', lineHeight: 1.5 }}>{s.text}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Input area */}
            <Box sx={{
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${instruction ? `${PURPLE}40` : 'rgba(255,255,255,0.09)'}`,
              overflow: 'hidden', transition: 'all .25s',
              boxShadow: instruction ? `0 0 0 4px ${PURPLE}10` : 'none',
            }}>
              <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="e.g. Alert me when a worker without a helmet enters the loading zone..."
                rows={5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  color: '#fff', fontSize: '0.92rem', lineHeight: 1.75,
                  padding: '20px 20px 12px',
                  fontFamily: '"Inter", system-ui, sans-serif',
                }}
              />
              {/* textarea placeholder color via global trick */}
              <style>{`textarea::placeholder { color: rgba(255,255,255,0.18); }`}</style>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.12)', fontSize: '.7rem' }}>↵ Enter to send</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.07)', fontSize: '.7rem' }}>⇧↵ New line</Typography>
                </Box>
                <Box onClick={canSend ? handleSend : undefined} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: '18px', py: '9px', borderRadius: '10px',
                  background: canSend ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canSend ? PURPLE + '70' : 'rgba(255,255,255,0.07)'}`,
                  cursor: canSend ? 'pointer' : 'default',
                  boxShadow: canSend ? `0 4px 16px ${PURPLE}40` : 'none',
                  transition: 'all .2s',
                  '&:hover': canSend ? { transform: 'translateY(-1px)', boxShadow: `0 8px 24px ${PURPLE}50` } : {},
                }}>
                  {processing ? (
                    <Box sx={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'sp 1s linear infinite', '@keyframes sp': { '100%': { transform: 'rotate(360deg)' } } }} />
                  ) : (
                    <SendIcon sx={{ fontSize: 14, color: canSend ? '#fff' : 'rgba(255,255,255,0.2)' }} />
                  )}
                  <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: canSend ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                    {processing ? 'Building pipeline...' : 'Generate Rule'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Processing state */}
            {processing && (
              <Box sx={{ mt: 2.5, p: '16px 20px', borderRadius: '14px', background: `${PURPLE}10`, border: `1px solid ${PURPLE}30`, animation: 'fadeIn .3s ease', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: .5 }}>
                    {[0, 1, 2].map(d => (
                      <Box key={d} sx={{ width: 5, height: 5, borderRadius: '50%', background: '#a5b4fc', animation: `dot 1.2s ease ${d * .2}s infinite`, '@keyframes dot': { '0%,100%': { opacity: .2 }, '50%': { opacity: 1 } } }} />
                    ))}
                  </Box>
                  <Typography sx={{ color: '#a5b4fc', fontSize: '.8rem', fontWeight: 600 }}>OMNIX AI is analyzing your instruction...</Typography>
                </Box>
                <Box sx={{ p: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '.78rem', fontStyle: 'italic' }}>"{lastSent}"</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  {['Extracting intent...', 'Identifying objects...', 'Building pipeline...'].map((t, i) => (
                    <Box key={i} sx={{ px: 1.2, py: .4, borderRadius: '6px', background: `${PURPLE}15`, border: `1px solid ${PURPLE}30`, animation: `fi .4s ease ${i * .3}s both`, '@keyframes fi': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
                      <Typography sx={{ color: '#a5b4fc', fontSize: '.65rem' }}>{t}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ height: 40 }} />
          </Box>
        </Box>

        {/* RIGHT */}
        <Box sx={{
          width: 380, flexShrink: 0, overflowY: 'auto',
          background: 'rgba(255,255,255,0.01)',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: `${PURPLE}35`, borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: `${PURPLE}60` },
        }}>
          <Box sx={{ p: '40px 28px' }}>

            {/* Generated Rules header */}
            <Box sx={{
              borderRadius: '16px', overflow: 'hidden', mb: 3,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <Box sx={{
                px: 3, py: '16px',
                background: `linear-gradient(135deg, ${PURPLE}12 0%, transparent 60%)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '.95rem', letterSpacing: '-.2px' }}>Generated Rules</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.72rem', mt: '.2rem' }}>Session history</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: .4, borderRadius: '20px', background: `${GREEN}12`, border: `1px solid ${GREEN}25` }}>
                  <Typography sx={{ color: GREEN, fontSize: '.65rem', fontWeight: 700 }}>{history.length} rules</Typography>
                </Box>
              </Box>

              {/* Rules list */}
              <Box sx={{ p: '8px 12px 12px' }}>
                {history.length === 0 ? (
                  <Box sx={{ p: '24px 16px', textAlign: 'center' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '.82rem', mb: .5 }}>No rules generated yet</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.12)', fontSize: '.75rem' }}>Try one of the quick examples</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {history.map((item, i) => (
                      <Box key={item.id} sx={{
                        p: '14px 16px', borderRadius: '12px',
                        background: i === 0 && !processing ? `${PURPLE}10` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${i === 0 && !processing ? `${PURPLE}30` : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all .25s',
                        '&:hover': { borderColor: `${PURPLE}25`, background: `${PURPLE}08` },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .8 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: .7 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                            <Typography sx={{ color: GREEN, fontSize: '.62rem', fontWeight: 700, letterSpacing: '.05em' }}>ACTIVE</Typography>
                          </Box>
                          <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '.65rem', fontFamily: 'monospace' }}>{item.time}</Typography>
                        </Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '.82rem', lineHeight: 1.55, mb: 1 }}>{item.instruction}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: .5 }}>
                          <Box sx={{ px: 1, py: .3, borderRadius: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '.6rem', fontFamily: 'monospace' }}>{item.pipeline}</Typography>
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

            {/* How it works */}
            <Box sx={{
              borderRadius: '16px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <Box sx={{ px: 3, py: '16px', background: `linear-gradient(135deg, ${CYAN}10 0%, transparent 60%)`, borderBottom: `1px solid ${CYAN}15` }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '.95rem', letterSpacing: '-.2px' }}>How It Works</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.72rem', mt: '.2rem' }}>From words to pipeline in seconds</Typography>
              </Box>
              <Box sx={{ p: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: .5 }}>
                {howItWorks.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: '10px 12px', borderRadius: '10px', transition: 'background .2s', '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    {/* Step number circle with icon */}
                    <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: `${s.color}18`, border: `1px solid ${s.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color, position: 'relative' }}>
                      {s.icon}
                      <Box sx={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: '#08080a', border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: s.color, fontSize: '.48rem', fontWeight: 800, lineHeight: 1 }}>{s.n}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '.8rem', lineHeight: 1.5 }}>{s.text}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ height: 40 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}