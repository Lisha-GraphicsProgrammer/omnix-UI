import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'

interface RotatingLoaderProps {
  messages: string[]
  intervalMs?: number
  accentColor?: string
}

/**
 * A small "thinking" card that cycles through status messages with a
 * pulsing dot and a soft fade/slide transition between them — replaces a
 * bare spinner with something that actually tells the person what's
 * happening, styled to sit naturally inside the existing chat bubbles.
 */
export default function RotatingLoader({
  messages,
  intervalMs = 2200,
  accentColor = '#00D4FF',
}: RotatingLoaderProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length)
        setVisible(true)
      }, 250)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [messages.length, intervalMs])

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.2,
        px: 2,
        py: 1.1,
        borderRadius: '14px',
        background: `${accentColor}0C`,
        border: `1px solid ${accentColor}30`,
      }}
    >
      <Box sx={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: accentColor,
            opacity: 0.35,
            animation: 'onvxp-ping 1.4s cubic-bezier(0,0,.2,1) infinite',
            '@keyframes onvxp-ping': {
              '0%': { transform: 'scale(0.6)', opacity: 0.5 },
              '100%': { transform: 'scale(1.8)', opacity: 0 },
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
          }}
        />
      </Box>
      <Typography
        sx={{
          color: accentColor,
          fontSize: '.8rem',
          fontWeight: 600,
          letterSpacing: '.01em',
          whiteSpace: 'nowrap',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity .25s ease, transform .25s ease',
        }}
      >
        {messages[index]}
      </Typography>
    </Box>
  )
}
