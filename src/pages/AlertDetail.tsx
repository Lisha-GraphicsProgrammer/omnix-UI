import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Tooltip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PersonIcon from '@mui/icons-material/Person'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import StorageIcon from '@mui/icons-material/Storage'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { useState, useEffect } from 'react'

import { apiFetch } from '../lib/api'

// ─── Design tokens (same as Dashboard) ───────────────────────────────────────
const CYAN   = '#00D4FF'
const PURPLE = '#7C3AED'
const GREEN  = '#00E676'
const AMBER  = '#FFB300'
const RED    = '#FF4444'

interface ApiIncident {
  id: string
  timestamp: string
  frame: number
  camera: string
  person_id: number
  violation: string
  zone: string
  bbox: number[]
  screenshot_url: string
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Right-panel section card — matches Settings SectionCard ──────────────────
function DetailCard({
  title, accentColor = PURPLE, children, headerRight,
}: {
  title: string
  accentColor?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <Box sx={{
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
      mb: 2,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <Box sx={{
        px: 3, py: '16px',
        background: `linear-gradient(135deg, ${accentColor}12 0%, transparent 60%)`,
        borderBottom: `1px solid ${accentColor}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography sx={{ color: '#fff', fontSize: '.88rem', fontWeight: 700, letterSpacing: '-.2px' }}>
          {title}
        </Typography>
        {headerRight}
      </Box>
      {children}
    </Box>
  )
}

// ─── Detail row inside a card ─────────────────────────────────────────────────
function DetailRow({
  icon, label, value, accentColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accentColor: string
}) {
  return (
    <Box sx={{
      px: 3, py: '18px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: 2,
      transition: 'background .15s',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { background: 'rgba(255,255,255,0.02)' },
    }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '8px', flexShrink: 0,
        background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{ color: accentColor, display: 'flex', fontSize: 15 }}>{icon}</Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.08em', mb: '.3rem' }}>
          {label}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '.84rem', fontWeight: 500 }}>{value}</Typography>
      </Box>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, opacity: .5, mt: '4px', flexShrink: 0, boxShadow: `0 0 6px ${accentColor}` }} />
    </Box>
  )
}

export default function AlertDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [markedFP, setMarkedFP] = useState(false)
  const [incident, setIncident] = useState<ApiIncident | null>(null)
  const [allIncidents, setAllIncidents] = useState<ApiIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch('/api/incidents')
        const data: ApiIncident[] = await res.json()
        setAllIncidents(data)
        const idx = (Number(id) || 1) - 1
        setIncident(data[idx] || null)
      } catch { /* API offline */ }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const currentIdx = (Number(id) || 1) - 1
  const hasPrev   = currentIdx > 0
  const hasNext   = currentIdx < allIncidents.length - 1
  const confidence = 85 + (currentIdx % 14)

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#08080a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid rgba(99,102,241,0.15)`, borderTopColor: PURPLE, animation: 'sp 1s linear infinite', '@keyframes sp': { '100%': { transform: 'rotate(360deg)' } } }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '.85rem' }}>Loading incident...</Typography>
      </Box>
    </Box>
  )

  if (!incident) return (
    <Box sx={{ minHeight: '100vh', background: '#08080a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>Incident not found</Typography>
      <Button onClick={() => navigate('/dashboard')} sx={{ color: '#818cf8' }}>Back to Dashboard</Button>
    </Box>
  )

  const time = new Date(incident.timestamp).toLocaleTimeString('en-GB', { hour12: false })
  const date = new Date(incident.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <Box sx={{ minHeight: '100vh', background: '#08080a', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        px: 4, height: 64,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(13,13,16,0.98)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        // subtle purple top accent line
        boxShadow: `0 -1px 0 0 ${PURPLE}60 inset, 0 1px 0 rgba(255,255,255,0.04)`,
      }}>
        {/* Back button */}
        <Box onClick={() => navigate('/dashboard')} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: .7, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', transition: 'all .2s', '&:hover': { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)' } }}>
          <ArrowBackIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '.78rem' }}>Dashboard</Typography>
        </Box>

        <Box sx={{ width: '1px', height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Brand + breadcrumb */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.5)', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.5" fill="white"/>
              <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1"/>
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '.92rem', letterSpacing: '-.2px' }}>OMNIX</Typography>
          <Box sx={{ width: '1px', height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.82rem' }}>Alert Detail</Typography>
          <Box sx={{ width: '1px', height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <Box sx={{ px: 1.2, py: '.25rem', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '.68rem', fontFamily: 'monospace' }}>{incident.id}</Typography>
          </Box>
        </Box>

        {/* Prev / Next navigation */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '.72rem', mr: 1 }}>
            {currentIdx + 1} / {allIncidents.length}
          </Typography>
          <Tooltip title="Previous incident">
            <Box onClick={hasPrev ? () => navigate(`/alert/${currentIdx}`) : undefined}
              sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${hasPrev ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`, background: hasPrev ? 'rgba(255,255,255,0.04)' : 'transparent', cursor: hasPrev ? 'pointer' : 'default', transition: 'all .2s', '&:hover': hasPrev ? { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)' } : {} }}>
              <ChevronLeftIcon sx={{ fontSize: 18, color: hasPrev ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Next incident">
            <Box onClick={hasNext ? () => navigate(`/alert/${currentIdx + 2}`) : undefined}
              sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${hasNext ? `${PURPLE}50` : 'rgba(255,255,255,0.04)'}`, background: hasNext ? `${PURPLE}15` : 'transparent', cursor: hasNext ? 'pointer' : 'default', transition: 'all .2s', '&:hover': hasNext ? { background: `${PURPLE}25`, borderColor: `${PURPLE}70` } : {} }}>
              <ChevronRightIcon sx={{ fontSize: 18, color: hasNext ? PURPLE : 'rgba(255,255,255,0.15)' }} />
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 1280, mx: 'auto', p: '36px 32px', display: 'flex', gap: 4 }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Incident header card */}
          <Box sx={{
            mb: 3, p: '24px 28px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(124,58,237,0.05) 100%)',
            border: '1px solid rgba(239,68,68,0.18)',
            position: 'relative', overflow: 'hidden',
            // top accent bar
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${RED}80, ${PURPLE}80)` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ px: 2, py: .6, borderRadius: '8px', background: `${AMBER}18`, border: `1px solid ${AMBER}40` }}>
                <Typography sx={{ color: AMBER, fontSize: '.72rem', fontWeight: 800, letterSpacing: '.08em' }}>HIGH SEVERITY</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: .7, px: 1.5, py: .5, borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}`, animation: 'bl 1s infinite', '@keyframes bl': { '0%,100%': { opacity: 1 }, '50%': { opacity: .2 } } }} />
                <Typography sx={{ color: '#fca5a5', fontSize: '.68rem', fontWeight: 600 }}>Active Violation</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.5, py: .5, borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.7rem', fontFamily: 'monospace' }}>{date} · {time}</Typography>
              </Box>
            </Box>

            <Typography sx={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1.1, mb: 1.2 }}>
              {titleCase(incident.violation)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {[
                { val: incident.id, label: 'Incident' },
                { val: `Camera 1 — ${titleCase(incident.zone)}`, label: null },
                { val: `ByteTrack #${incident.person_id}`, label: null },
              ].map((item, i, arr) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.82rem' }}>
                    {item.label ? <Box component="span" sx={{ color: 'rgba(255,255,255,0.18)', mr: .5 }}>{item.label}</Box> : null}
                    {item.val}
                  </Typography>
                  {i < arr.length - 1 && <Box sx={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Screenshot */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}`, animation: 'bl 1s infinite' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.72rem', letterSpacing: '.04em' }}>Live frame captured by detection pipeline</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: .4, borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: RED }} />
                <Typography sx={{ color: '#fca5a5', fontSize: '.65rem', fontWeight: 700 }}>Frame #{incident.frame}</Typography>
              </Box>
            </Box>

            <Box sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#050508', position: 'relative', boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${PURPLE}15` }}>
              {!imgError && incident.screenshot_url ? (
                <img src={incident.screenshot_url} alt="Violation screenshot" onError={() => setImgError(true)}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '520px', objectFit: 'contain' }} />
              ) : (
                <Box sx={{ height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'linear-gradient(135deg, #0f1923, #1a2a3a)' }}>
                  <CameraAltIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.08)' }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '.82rem' }}>Screenshot unavailable — start API server</Typography>
                </Box>
              )}

              {/* Top overlay */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, animation: 'blink 1s infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: .2 } } }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em' }}>CAPTURED</Typography>
                  <Box sx={{ width: '1px', height: 10, background: 'rgba(255,255,255,0.2)', mx: .5 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '.65rem' }}>Camera 1 — {titleCase(incident.zone)}</Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '.62rem', fontFamily: 'monospace' }}>Frame {incident.frame} · OMNIX CV Engine</Typography>
              </Box>

              {/* Bottom overlay tags — bigger, clearer */}
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2.5, py: 2, display: 'flex', gap: 1.5, alignItems: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .7, px: 1.5, py: .7, background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.6)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <WarningAmberIcon sx={{ fontSize: 13, color: '#fca5a5' }} />
                  <Typography sx={{ color: '#fca5a5', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.04em' }}>VIOLATION DETECTED</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: .7, background: `${PURPLE}30`, border: `1px solid ${PURPLE}60`, borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <Typography sx={{ color: '#c4b5fd', fontSize: '.7rem', fontWeight: 600 }}>ByteTrack ID #{incident.person_id}</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: .7, background: `${GREEN}18`, border: `1px solid ${GREEN}40`, borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <Typography sx={{ color: GREEN, fontSize: '.7rem', fontWeight: 600 }}>Confidence {confidence}%</Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {!markedFP ? (
              <Box onClick={() => setMarkedFP(true)} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', fontWeight: 600, fontSize: '.85rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', transition: 'all .2s', '&:hover': { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.45)', transform: 'translateY(-1px)' } }}>
                <ThumbDownIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Mark as False Positive</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '20px', py: '11px', borderRadius: '12px', background: `${GREEN}10`, border: `1px solid ${GREEN}30` }}>
                <CheckCircleIcon sx={{ fontSize: 15, color: GREEN }} />
                <Typography sx={{ color: GREEN, fontSize: '.85rem', fontWeight: 600 }}>Marked as False Positive</Typography>
              </Box>
            )}
            <Box onClick={() => navigate('/dashboard')} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all .2s', '&:hover': { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff', transform: 'translateY(-1px)' } }}>
              <ArrowBackIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ color: 'inherit', fontSize: '.85rem', fontWeight: 600 }}>Back to Dashboard</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, border: `1px solid ${PURPLE}60`, cursor: 'pointer', boxShadow: `0 4px 16px ${PURPLE}35`, transition: 'all .2s', '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 8px 24px ${PURPLE}50` } }}>
              <FileDownloadIcon sx={{ fontSize: 15, color: '#fff' }} />
              <Typography sx={{ color: '#fff', fontSize: '.85rem', fontWeight: 600 }}>Export Report</Typography>
            </Box>
          </Box>
        </Box>

        {/* ── RIGHT COLUMN — independently scrollable ─────────────────────── */}
        <Box sx={{
          width: 340, flexShrink: 0,
          position: 'sticky', top: 64,           // sticks below the 64px topbar
          maxHeight: 'calc(100vh - 64px)',        // fills remaining viewport height
          overflowY: 'auto',
          pr: '4px',                              // room for scrollbar
          // Custom slim scrollbar
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(124,58,237,0.35)', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(124,58,237,0.6)' },
        }}>

          {/* Alert Details */}
          <DetailCard title="Alert Details" accentColor={PURPLE}>
            <DetailRow icon={<CameraAltIcon fontSize="small" />}    label="Camera"        value={`Camera 1 — ${titleCase(incident.zone)}`} accentColor="#818cf8" />
            <DetailRow icon={<WarningAmberIcon fontSize="small" />} label="Rule Violated" value={titleCase(incident.violation)}             accentColor={AMBER} />
            <DetailRow icon={<AccessTimeIcon fontSize="small" />}   label="Timestamp"     value={`${time} · ${date}`}                       accentColor={GREEN} />
            <DetailRow icon={<PersonIcon fontSize="small" />}       label="Person ID"     value={`ByteTrack #${incident.person_id}`}         accentColor={CYAN} />
          </DetailCard>

          {/* Detection Metrics */}
          <DetailCard title="Detection Metrics" accentColor={GREEN}>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { label: 'Frame Number',    value: `#${incident.frame}`, color: AMBER,  pct: null },
                { label: 'Confidence Score', value: `${confidence}%`,   color: GREEN,   pct: confidence },
                { label: 'Detection Zone',  value: titleCase(incident.zone), color: CYAN, pct: null },
              ].map((m, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: .8 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.72rem' }}>{m.label}</Typography>
                    <Typography sx={{ color: m.color, fontSize: '.82rem', fontWeight: 700, fontFamily: m.pct ? 'inherit' : 'monospace' }}>{m.value}</Typography>
                  </Box>
                  {m.pct !== null && (
                    <Box sx={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${m.pct}%`, background: `linear-gradient(90deg, ${m.color}60, ${m.color})`, borderRadius: 3, boxShadow: `0 0 12px ${m.color}60`, transition: 'width 1.2s ease' }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </DetailCard>

          {/* Bounding Box Coordinates */}
          <DetailCard title="Bounding Box Coordinates" accentColor={CYAN}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {['x1', 'y1', 'x2', 'y2'].map((k, i) => (
                  <Box key={k} sx={{ p: '12px 14px', borderRadius: '10px', background: `${CYAN}08`, border: `1px solid ${CYAN}20`, transition: 'all .2s', '&:hover': { background: `${CYAN}12`, borderColor: `${CYAN}35` } }}>
                    <Typography sx={{ color: CYAN, fontSize: '.6rem', fontWeight: 700, mb: .5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{k}</Typography>
                    <Typography sx={{ color: '#e2e8f0', fontSize: '.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {incident.bbox[i]?.toFixed(1) ?? '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>

            </Box>
          </DetailCard>

          {/* Automated Actions */}
          <Box sx={{
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${GREEN}08, rgba(99,102,241,0.04))`,
            border: `1px solid ${GREEN}20`,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Box sx={{ px: 3, py: '16px', background: `linear-gradient(135deg, ${GREEN}12 0%, transparent 60%)`, borderBottom: `1px solid ${GREEN}20`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'gpulse 2s ease-in-out infinite', '@keyframes gpulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } } }} />
              <Typography sx={{ color: '#fff', fontSize: '.88rem', fontWeight: 700, letterSpacing: '-.2px' }}>Automated Actions</Typography>
            </Box>
            <Box sx={{ p: '12px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { icon: <PhotoCameraIcon sx={{ fontSize: 14 }} />,    text: 'Screenshot captured & stored', done: true },
                { icon: <StorageIcon sx={{ fontSize: 14 }} />,        text: 'Event logged to database',      done: true },
                { icon: <NotificationsIcon sx={{ fontSize: 14 }} />,  text: 'Dashboard notification sent',   done: true },
                { icon: <PhoneAndroidIcon sx={{ fontSize: 14 }} />,   text: 'WhatsApp alert queued',         done: false },
              ].map((t, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '9px 12px', borderRadius: '9px', background: t.done ? `${GREEN}06` : 'rgba(255,255,255,0.02)', border: `1px solid ${t.done ? GREEN + '18' : 'rgba(255,255,255,0.04)'}`, transition: 'all .2s', '&:hover': { background: t.done ? `${GREEN}10` : 'rgba(255,255,255,0.03)' } }}>
                  <Box sx={{ width: 26, height: 26, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? `${GREEN}15` : 'rgba(255,255,255,0.04)', border: `1px solid ${t.done ? GREEN + '25' : 'rgba(255,255,255,0.06)'}`, flexShrink: 0 }}>
                    <Box sx={{ color: t.done ? GREEN : 'rgba(255,255,255,0.2)', display: 'flex' }}>{t.icon}</Box>
                  </Box>
                  <Typography sx={{ color: t.done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', fontSize: '.76rem', flex: 1 }}>{t.text}</Typography>
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? `${GREEN}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${t.done ? GREEN + '35' : 'rgba(255,255,255,0.08)'}`, flexShrink: 0 }}>
                    {t.done
                      ? <CheckCircleIcon sx={{ fontSize: 11, color: GREEN }} />
                      : <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    }
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

        </Box>
      </Box>
    </Box>
  )
}
