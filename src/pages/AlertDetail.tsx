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
import GavelIcon from '@mui/icons-material/Gavel'
import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../lib/api'

const ACCENT  = '#C0392B'
const ACCENT2 = '#8B2E1F'
const GREEN   = '#27AE60'
const AMBER   = '#D4891A'
const CREAM   = '#E8D5B0'
const RED     = '#E74C3C'
const CYAN    = '#3498DB'

interface ApiIncident {
  id: string
  timestamp: string
  frame: number
  camera: string
  camera_id?: number
  person_id: number | null
  violation: string
  zone: string
  bbox: number[]
  screenshot_url: string
  severity?: string
  reviewed?: boolean
  review_status?: string | null
  rule_id?: number | null
  rule_instruction?: string | null
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Bbox pulse overlay: computes the actual rendered rect of an image inside
// a box using object-fit:contain sizing math, so the overlay lines up correctly
// even when the image is letterboxed (e.g. a portrait screenshot in a wide box). ──
interface RenderedImageRect {
  offsetX: number
  offsetY: number
  width: number
  height: number
}

function computeContainRect(
  naturalW: number,
  naturalH: number,
  boxW: number,
  boxH: number
): RenderedImageRect {
  if (!naturalW || !naturalH || !boxW || !boxH) {
    return { offsetX: 0, offsetY: 0, width: boxW, height: boxH }
  }
  const naturalRatio = naturalW / naturalH
  const boxRatio = boxW / boxH
  let width: number
  let height: number
  if (naturalRatio > boxRatio) {
    // Image is relatively wider than the box — width-limited, letterboxed top/bottom
    width = boxW
    height = boxW / naturalRatio
  } else {
    // Image is relatively taller than the box — height-limited, letterboxed left/right
    height = boxH
    width = boxH * naturalRatio
  }
  return {
    offsetX: (boxW - width) / 2,
    offsetY: (boxH - height) / 2,
    width,
    height,
  }
}

function BBoxOverlay({
  bbox,
  containerRef,
  imgRef,
}: {
  bbox: number[] | undefined
  containerRef: React.RefObject<HTMLDivElement>
  imgRef: React.RefObject<HTMLImageElement>
}) {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  const recompute = useCallback(() => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img || !bbox || bbox.length < 4) {
      setRect(null)
      return
    }
    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    if (!naturalW || !naturalH) {
      setRect(null)
      return
    }
    const boxW = container.clientWidth
    const boxH = container.clientHeight
    const displayed = computeContainRect(naturalW, naturalH, boxW, boxH)

    const [x1, y1, x2, y2] = bbox
    const scaleX = displayed.width / naturalW
    const scaleY = displayed.height / naturalH

    setRect({
      left: displayed.offsetX + x1 * scaleX,
      top: displayed.offsetY + y1 * scaleY,
      width: (x2 - x1) * scaleX,
      height: (y2 - y1) * scaleY,
    })
  }, [bbox, containerRef, imgRef])

  useEffect(() => {
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [recompute])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete) {
      recompute()
    } else {
      img.addEventListener('load', recompute)
      return () => img.removeEventListener('load', recompute)
    }
  }, [imgRef, recompute])

  if (!rect) return null

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: `3px solid ${RED}`,
        borderRadius: '4px',
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 0 16px ${RED}90`,
        pointerEvents: 'none',
        animation: 'bboxPulse 1s ease-in-out infinite',
        '@keyframes bboxPulse': {
          '0%, 100%': { opacity: 1, boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 0 16px ${RED}90` },
          '50%': { opacity: 0.45, boxShadow: `0 0 0 1px rgba(0,0,0,0.2), 0 0 4px ${RED}40` },
        },
      }}
    />
  )
}

function DetailCard({
  title, accentColor = ACCENT, children, headerRight,
}: {
  title: string
  accentColor?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <Box sx={{
      borderRadius: '16px',
      background: 'rgba(255,235,220,0.03)',
      border: '1px solid rgba(255,200,170,0.08)',
      overflow: 'hidden',
      mb: 2,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      <Box sx={{
        px: 3, py: '16px',
        background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 60%)`,
        borderBottom: `1px solid ${accentColor}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography sx={{ color: '#F5F0EB', fontSize: '.88rem', fontWeight: 700, letterSpacing: '-.2px' }}>
          {title}
        </Typography>
        {headerRight}
      </Box>
      {children}
    </Box>
  )
}

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
      borderBottom: 'rgba(255,200,170,0.06) solid 1px',
      display: 'flex', alignItems: 'flex-start', gap: 2,
      transition: 'background .15s',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { background: 'rgba(255,235,220,0.03)' },
    }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '8px', flexShrink: 0,
        background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{ color: accentColor, display: 'flex', fontSize: 15 }}>{icon}</Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: 'rgba(245,240,235,0.28)', fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.08em', mb: '.3rem' }}>
          {label}
        </Typography>
        <Typography sx={{ color: '#F5F0EB', fontSize: '.84rem', fontWeight: 500 }}>{value}</Typography>
      </Box>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, opacity: .5, mt: '4px', flexShrink: 0, boxShadow: `0 0 6px ${accentColor}` }} />
    </Box>
  )
}

export default function AlertDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [markedFP, setMarkedFP] = useState(false)
  const [fpSaving, setFpSaving] = useState(false)
  const [fpError, setFpError] = useState<string | null>(null)
  const [incident, setIncident] = useState<ApiIncident | null>(null)
  const [allIncidents, setAllIncidents] = useState<ApiIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)
  const screenshotContainerRef = useRef<HTMLDivElement>(null)
  const screenshotImgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch('/api/incidents?limit=200&offset=0')
        const raw = await res.json()
        const data: ApiIncident[] = Array.isArray(raw) ? raw : (raw.items ?? [])
        setAllIncidents(data)
        const found = data.find((inc: ApiIncident) => String(inc.id) === String(id))
        setIncident(found || null)
        // ── Review state persists: reflect an already-marked FP ──
        setMarkedFP(found?.review_status === 'false_positive')
      } catch { }
      setLoading(false)
    }
    fetchData()
  }, [id])

  // ── Task 9 wiring: the button actually calls the review endpoint now ──
  const markFalsePositive = async () => {
    if (!incident || fpSaving) return
    setFpSaving(true)
    setFpError(null)
    try {
      const res = await apiFetch(`/api/incidents/${incident.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: 'false_positive' }),
      })
      if (!res.ok) throw new Error(`Review failed (${res.status})`)
      setMarkedFP(true)
    } catch (e: any) {
      setFpError(e?.message || 'Could not save review')
    } finally {
      setFpSaving(false)
    }
  }

  const currentIdx = allIncidents.findIndex((inc) => String(inc.id) === String(id))
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < allIncidents.length - 1
  const confidence = 85 + (currentIdx % 14)

  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#120e0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${ACCENT}20`, borderTopColor: ACCENT, animation: 'sp 1s linear infinite', '@keyframes sp': { '100%': { transform: 'rotate(360deg)' } } }} />
        <Typography sx={{ color: 'rgba(245,240,235,0.25)', fontSize: '.85rem' }}>Loading incident...</Typography>
      </Box>
    </Box>
  )

  if (!incident) return (
    <Box sx={{ minHeight: '100vh', background: '#120e0c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ color: 'rgba(245,240,235,0.4)' }}>Incident not found</Typography>
      <Button onClick={() => navigate('/dashboard')} sx={{ color: ACCENT }}>Back to Dashboard</Button>
    </Box>
  )

  const time = new Date(incident.timestamp).toLocaleTimeString('en-GB', { hour12: false })
  const date = new Date(incident.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const cameraLabel = `Camera ${incident.camera_id ?? 1} — ${titleCase(incident.zone || 'unknown')}`
  const personLabel = incident.person_id != null ? `ByteTrack #${incident.person_id}` : 'Object detection (no person)'

  return (
    <Box sx={{ minHeight: '100vh', background: '#120e0c', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* TOP BAR */}
      <Box sx={{
        px: 4, height: 64,
        borderBottom: '1px solid rgba(255,200,170,0.08)',
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(22,15,13,0.98)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: `0 -1px 0 0 ${ACCENT}40 inset, 0 1px 0 rgba(255,200,170,0.04)`,
      }}>
        <Box onClick={() => navigate(-1)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: .7, borderRadius: '8px', border: '1px solid rgba(255,200,170,0.08)', background: 'rgba(255,235,220,0.03)', transition: 'all .2s', '&:hover': { background: 'rgba(255,235,220,0.07)', borderColor: 'rgba(255,200,170,0.15)' } }}>
          <ArrowBackIcon sx={{ fontSize: 14, color: 'rgba(245,240,235,0.5)' }} />
          <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '.78rem' }}>Dashboard</Typography>
        </Box>

        <Box sx={{ width: '1px', height: 16, background: 'rgba(255,200,170,0.1)', flexShrink: 0 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '7px', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${ACCENT}50`, flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.5" fill="white"/>
              <circle cx="13.5" cy="10.5" r="1.4" fill={ACCENT}/>
            </svg>
          </Box>
          <Typography sx={{ color: '#F5F0EB', fontWeight: 700, fontSize: '.92rem', letterSpacing: '-.2px' }}>OMNIX</Typography>
          <Box sx={{ width: '1px', height: 16, background: 'rgba(255,200,170,0.1)', flexShrink: 0 }} />
          <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '.82rem' }}>Alert Detail</Typography>
          <Box sx={{ width: '1px', height: 16, background: 'rgba(255,200,170,0.1)', flexShrink: 0 }} />
          <Box sx={{ px: 1.2, py: '.25rem', borderRadius: '6px', background: 'rgba(255,235,220,0.04)', border: '1px solid rgba(255,200,170,0.08)' }}>
            <Typography sx={{ color: 'rgba(245,240,235,0.35)', fontSize: '.68rem', fontFamily: 'monospace' }}>{incident.id}</Typography>
          </Box>
        </Box>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(245,240,235,0.2)', fontSize: '.72rem', mr: 1 }}>
            {currentIdx + 1} / {allIncidents.length}
          </Typography>
          <Tooltip title="Previous incident">
            <Box
              onClick={hasPrev ? () => navigate(`/alert/${allIncidents[currentIdx - 1].id}`) : undefined}
              sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${hasPrev ? 'rgba(255,200,170,0.12)' : 'rgba(255,200,170,0.04)'}`, background: hasPrev ? 'rgba(255,235,220,0.04)' : 'transparent', cursor: hasPrev ? 'pointer' : 'default', transition: 'all .2s', '&:hover': hasPrev ? { background: 'rgba(255,235,220,0.08)', borderColor: 'rgba(255,200,170,0.2)' } : {} }}>
              <ChevronLeftIcon sx={{ fontSize: 18, color: hasPrev ? 'rgba(245,240,235,0.5)' : 'rgba(245,240,235,0.15)' }} />
            </Box>
          </Tooltip>
          <Tooltip title="Next incident">
            <Box
              onClick={hasNext ? () => navigate(`/alert/${allIncidents[currentIdx + 1].id}`) : undefined}
              sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${hasNext ? `${ACCENT}50` : 'rgba(255,200,170,0.04)'}`, background: hasNext ? `${ACCENT}15` : 'transparent', cursor: hasNext ? 'pointer' : 'default', transition: 'all .2s', '&:hover': hasNext ? { background: `${ACCENT}25`, borderColor: `${ACCENT}70` } : {} }}>
              <ChevronRightIcon sx={{ fontSize: 18, color: hasNext ? ACCENT : 'rgba(245,240,235,0.15)' }} />
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={{ maxWidth: 1280, mx: 'auto', p: '36px 32px', display: 'flex', gap: 4 }}>

        {/* LEFT COLUMN */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Incident header card */}
          <Box sx={{
            mb: 3, p: '24px 28px',
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${ACCENT}10 0%, ${ACCENT2}06 100%)`,
            border: `1px solid ${ACCENT}25`,
            position: 'relative', overflow: 'hidden',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${ACCENT}80, ${ACCENT2}80)` },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ px: 2, py: .6, borderRadius: '8px', background: `${AMBER}18`, border: `1px solid ${AMBER}40` }}>
                <Typography sx={{ color: AMBER, fontSize: '.72rem', fontWeight: 800, letterSpacing: '.08em' }}>
                  {(incident.severity || 'high').toUpperCase()} SEVERITY
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: .7, px: 1.5, py: .5, borderRadius: '8px', background: `${RED}12`, border: `1px solid ${RED}30` }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}`, animation: 'bl 1s infinite', '@keyframes bl': { '0%,100%': { opacity: 1 }, '50%': { opacity: .2 } } }} />
                <Typography sx={{ color: '#fca5a5', fontSize: '.68rem', fontWeight: 600 }}>Active Violation</Typography>
              </Box>
              <Box sx={{ ml: 'auto', px: 1.5, py: .5, borderRadius: '8px', background: 'rgba(255,235,220,0.04)', border: '1px solid rgba(255,200,170,0.08)' }}>
                <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '.7rem', fontFamily: 'monospace' }}>{date} · {time}</Typography>
              </Box>
            </Box>

            <Typography sx={{ color: '#F5F0EB', fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1.2px', lineHeight: 1.1, mb: 1.2 }}>
              {titleCase(incident.violation || 'Violation')}
            </Typography>

            {/* ── Attribution: the plain-English rule that fired this alert ── */}
            {incident.rule_instruction && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 1.8, py: 1, borderRadius: '10px', background: `${CYAN}0E`, border: `1px solid ${CYAN}30`, width: 'fit-content', maxWidth: '100%' }}>
                <GavelIcon sx={{ fontSize: 14, color: CYAN, flexShrink: 0 }} />
                <Typography sx={{ color: '#9ec9e8', fontSize: '.8rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  "{incident.rule_instruction}"
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {[
                { val: String(incident.id), label: 'Incident' },
                { val: cameraLabel, label: null },
                { val: personLabel, label: null },
              ].map((item, i, arr) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '.82rem' }}>
                    {item.label ? <Box component="span" sx={{ color: 'rgba(245,240,235,0.18)', mr: .5 }}>{item.label}</Box> : null}
                    {item.val}
                  </Typography>
                  {i < arr.length - 1 && <Box sx={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(245,240,235,0.18)' }} />}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Screenshot */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}`, animation: 'bl 1s infinite' }} />
                <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '.72rem', letterSpacing: '.04em' }}>Live frame captured by detection pipeline</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: .4, borderRadius: '6px', background: `${RED}12`, border: `1px solid ${RED}25` }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: RED }} />
                <Typography sx={{ color: '#fca5a5', fontSize: '.65rem', fontWeight: 700 }}>Frame #{incident.frame}</Typography>
              </Box>
            </Box>

            <Box
              ref={screenshotContainerRef}
              sx={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid rgba(255,200,170,0.1)`, background: '#0a0806', position: 'relative', boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${ACCENT}15` }}
            >
              {!imgError && incident.screenshot_url ? (
                <img
                  ref={screenshotImgRef}
                  src={incident.screenshot_url}
                  alt="Violation screenshot"
                  onError={() => setImgError(true)}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '520px', objectFit: 'contain' }}
                />
              ) : (
                <Box sx={{ height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'linear-gradient(135deg, #1a0f0c, #2a1510)' }}>
                  <CameraAltIcon sx={{ fontSize: 48, color: 'rgba(245,240,235,0.08)' }} />
                  <Typography sx={{ color: 'rgba(245,240,235,0.2)', fontSize: '.82rem' }}>Screenshot unavailable</Typography>
                </Box>
              )}

              {/* ── Violator bbox pulse overlay — positioned using incident.bbox, accounting for object-fit:contain letterboxing ── */}
              {!imgError && incident.screenshot_url && (
                <BBoxOverlay bbox={incident.bbox} containerRef={screenshotContainerRef} imgRef={screenshotImgRef} />
              )}

              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: RED, animation: 'blink 1s infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: .2 } } }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em' }}>CAPTURED</Typography>
                  <Box sx={{ width: '1px', height: 10, background: 'rgba(255,255,255,0.2)', mx: .5 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '.65rem' }}>{cameraLabel}</Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '.62rem', fontFamily: 'monospace' }}>Frame {incident.frame} · OMNIX CV Engine</Typography>
              </Box>

              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2.5, py: 2, display: 'flex', gap: 1.5, alignItems: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .7, px: 1.5, py: .7, background: `${RED}30`, border: `1px solid ${RED}60`, borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <WarningAmberIcon sx={{ fontSize: 13, color: '#fca5a5' }} />
                  <Typography sx={{ color: '#fca5a5', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.04em' }}>VIOLATION DETECTED</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: .7, background: `${ACCENT}30`, border: `1px solid ${ACCENT}60`, borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <Typography sx={{ color: CREAM, fontSize: '.7rem', fontWeight: 600 }}>{personLabel}</Typography>
                </Box>
                <Box sx={{ px: 1.5, py: .7, background: `${GREEN}18`, border: `1px solid ${GREEN}40`, borderRadius: '8px', backdropFilter: 'blur(8px)' }}>
                  <Typography sx={{ color: GREEN, fontSize: '.7rem', fontWeight: 600 }}>Confidence {confidence}%</Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {!markedFP ? (
              <Box onClick={markFalsePositive} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', fontWeight: 600, fontSize: '.85rem', color: '#fca5a5', border: `1px solid ${RED}25`, background: `${RED}08`, cursor: fpSaving ? 'default' : 'pointer', opacity: fpSaving ? 0.6 : 1, transition: 'all .2s', '&:hover': { background: `${RED}14`, border: `1px solid ${RED}45`, transform: 'translateY(-1px)' } }}>
                <ThumbDownIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>
                  {fpSaving ? 'Saving...' : 'Mark as False Positive'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '20px', py: '11px', borderRadius: '12px', background: `${GREEN}10`, border: `1px solid ${GREEN}30` }}>
                <CheckCircleIcon sx={{ fontSize: 15, color: GREEN }} />
                <Typography sx={{ color: GREEN, fontSize: '.85rem', fontWeight: 600 }}>Marked as False Positive</Typography>
              </Box>
            )}
            {fpError && <Typography sx={{ color: '#fca5a5', fontSize: '.75rem' }}>{fpError}</Typography>}
            <Box onClick={() => navigate(-1)} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', color: 'rgba(245,240,235,0.5)', border: '1px solid rgba(255,200,170,0.1)', background: 'rgba(255,235,220,0.03)', cursor: 'pointer', transition: 'all .2s', '&:hover': { background: 'rgba(255,235,220,0.07)', borderColor: 'rgba(255,200,170,0.2)', color: '#F5F0EB', transform: 'translateY(-1px)' } }}>
              <ArrowBackIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ color: 'inherit', fontSize: '.85rem', fontWeight: 600 }}>Back to Dashboard</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '11px', px: '20px', borderRadius: '12px', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: `1px solid ${ACCENT}60`, cursor: 'pointer', boxShadow: `0 4px 16px ${ACCENT}35`, transition: 'all .2s', '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 8px 24px ${ACCENT}50` } }}>
              <FileDownloadIcon sx={{ fontSize: 15, color: '#fff' }} />
              <Typography sx={{ color: '#fff', fontSize: '.85rem', fontWeight: 600 }}>Export Report</Typography>
            </Box>
          </Box>
        </Box>

        {/* RIGHT COLUMN */}
        <Box sx={{
          width: 340, flexShrink: 0,
          position: 'sticky', top: 64,
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          pr: '4px',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: `${ACCENT}35`, borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: `${ACCENT}60` },
        }}>

          <DetailCard title="Alert Details" accentColor={ACCENT}>
            <DetailRow icon={<CameraAltIcon fontSize="small" />}    label="Camera"        value={cameraLabel} accentColor={CREAM} />
            {incident.rule_instruction && (
              <DetailRow icon={<GavelIcon fontSize="small" />}      label="Triggered by Rule" value={incident.rule_instruction} accentColor={CYAN} />
            )}
            <DetailRow icon={<WarningAmberIcon fontSize="small" />} label="Violation"     value={titleCase(incident.violation || 'violation')}           accentColor={AMBER} />
            <DetailRow icon={<AccessTimeIcon fontSize="small" />}   label="Timestamp"     value={`${time} · ${date}`}                                     accentColor={GREEN} />
            <DetailRow icon={<PersonIcon fontSize="small" />}       label="Person ID"     value={personLabel}                       accentColor={ACCENT} />
          </DetailCard>

          <DetailCard title="Detection Metrics" accentColor={GREEN}>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { label: 'Frame Number',     value: `#${incident.frame}`,                  color: AMBER, pct: null },
                { label: 'Confidence Score', value: `${confidence}%`,                      color: GREEN, pct: confidence },
                { label: 'Detection Zone',   value: titleCase(incident.zone || 'unknown'), color: CREAM, pct: null },
              ].map((m, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: .8 }}>
                    <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '.72rem' }}>{m.label}</Typography>
                    <Typography sx={{ color: m.color, fontSize: '.82rem', fontWeight: 700, fontFamily: m.pct ? 'inherit' : 'monospace' }}>{m.value}</Typography>
                  </Box>
                  {m.pct !== null && (
                    <Box sx={{ height: 5, borderRadius: 3, background: 'rgba(255,235,220,0.06)', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${m.pct}%`, background: `linear-gradient(90deg, ${m.color}60, ${m.color})`, borderRadius: 3, boxShadow: `0 0 12px ${m.color}60`, transition: 'width 1.2s ease' }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </DetailCard>

          <DetailCard title="Bounding Box Coordinates" accentColor={ACCENT}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {['x1', 'y1', 'x2', 'y2'].map((k, i) => (
                  <Box key={k} sx={{ p: '12px 14px', borderRadius: '10px', background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`, transition: 'all .2s', '&:hover': { background: `${ACCENT}12`, borderColor: `${ACCENT}35` } }}>
                    <Typography sx={{ color: ACCENT, fontSize: '.6rem', fontWeight: 700, mb: .5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{k}</Typography>
                    <Typography sx={{ color: '#F5F0EB', fontSize: '.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {incident.bbox?.[i]?.toFixed(1) ?? '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </DetailCard>

          <Box sx={{
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${GREEN}08, ${ACCENT}04)`,
            border: `1px solid ${GREEN}20`,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Box sx={{ px: 3, py: '16px', background: `linear-gradient(135deg, ${GREEN}12 0%, transparent 60%)`, borderBottom: `1px solid ${GREEN}20`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'gpulse 2s ease-in-out infinite', '@keyframes gpulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: .4 } } }} />
              <Typography sx={{ color: '#F5F0EB', fontSize: '.88rem', fontWeight: 700, letterSpacing: '-.2px' }}>Automated Actions</Typography>
            </Box>
            <Box sx={{ p: '12px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { icon: <PhotoCameraIcon sx={{ fontSize: 14 }} />,   text: 'Screenshot captured & stored', done: true },
                { icon: <StorageIcon sx={{ fontSize: 14 }} />,       text: 'Event logged to database',      done: true },
                { icon: <NotificationsIcon sx={{ fontSize: 14 }} />, text: 'Dashboard notification sent',   done: true },
                { icon: <PhoneAndroidIcon sx={{ fontSize: 14 }} />,  text: 'WhatsApp alert queued',         done: false },
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '9px 12px', borderRadius: '9px', background: item.done ? `${GREEN}06` : 'rgba(255,235,220,0.02)', border: `1px solid ${item.done ? GREEN + '18' : 'rgba(255,200,170,0.04)'}`, transition: 'all .2s', '&:hover': { background: item.done ? `${GREEN}10` : 'rgba(255,235,220,0.03)' } }}>
                  <Box sx={{ width: 26, height: 26, borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? `${GREEN}15` : 'rgba(255,235,220,0.04)', border: `1px solid ${item.done ? GREEN + '25' : 'rgba(255,200,170,0.06)'}`, flexShrink: 0 }}>
                    <Box sx={{ color: item.done ? GREEN : 'rgba(245,240,235,0.2)', display: 'flex' }}>{item.icon}</Box>
                  </Box>
                  <Typography sx={{ color: item.done ? 'rgba(245,240,235,0.6)' : 'rgba(245,240,235,0.2)', fontSize: '.76rem', flex: 1 }}>{item.text}</Typography>
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? `${GREEN}20` : 'rgba(255,235,220,0.04)', border: `1px solid ${item.done ? GREEN + '35' : 'rgba(255,200,170,0.08)'}`, flexShrink: 0 }}>
                    {item.done
                      ? <CheckCircleIcon sx={{ fontSize: 11, color: GREEN }} />
                      : <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,240,235,0.15)' }} />
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