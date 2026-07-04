import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, Button, Typography, Alert, InputAdornment } from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import { useAuth } from '../context/AuthContext'
import { registerRequest } from '../api/auth'

const inp = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.06)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5 },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.6)', borderWidth: 1.5 },
    '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: 2 },
    '&.Mui-focused': { background: 'rgba(99,102,241,0.06)', boxShadow: '0 0 0 4px rgba(99,102,241,0.1)' },
    transition: 'all .2s'
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: '.88rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
  '& input': { color: '#fff', fontSize: '.95rem' },
}

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [siteName, setSiteName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const { login } = useAuth()

  const handleSignup = async () => {
    if (!name || !email || !password || !siteName) {
      setErr('All fields are required')
      return
    }
    setErr('')
    setLoading(true)
    try {
      const data = await registerRequest(name, email, password, siteName)
      login(data.access_token, data.user)
      nav('/rules', { replace: true })
    } catch (e: any) {
      setErr(e?.message === 'NETWORK'
        ? 'Could not reach the server. Is the backend running?'
        : (e?.message || 'Registration failed'))
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080a' }}>
      <Box sx={{ width: '100%', maxWidth: 420, px: 3 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5, justifyContent: 'center' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '9px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3.5" fill="white"/>
              <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1"/>
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>OMNIX</Typography>
        </Box>

        <Typography sx={{ color: '#fff', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', mb: 1 }}>
          Create your account
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.88rem', mb: 4 }}>
          Set up your OMNIX monitoring workspace
        </Typography>

        {err && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', '& .MuiAlert-icon': { color: '#f87171' } }}>
            {err}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField fullWidth label="Full name" variant="outlined"
            value={name} onChange={e => setName(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 17 }} /></InputAdornment> } }}
            sx={inp} />

          <TextField fullWidth label="Work email" variant="outlined"
            value={email} onChange={e => setEmail(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 17 }} /></InputAdornment> } }}
            sx={inp} />

          <TextField fullWidth label="Password" variant="outlined" type="password"
            value={password} onChange={e => setPassword(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 17 }} /></InputAdornment> } }}
            sx={inp} />

          <TextField fullWidth label="Site name (e.g. Site A — Construction)" variant="outlined"
            value={siteName} onChange={e => setSiteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignup()}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 17 }} /></InputAdornment> } }}
            sx={inp} />

          <Button fullWidth variant="contained" onClick={handleSignup} disabled={loading}
            sx={{
              mt: .5, py: 1.9, borderRadius: '12px',
              fontWeight: 600, fontSize: '.95rem', textTransform: 'none', color: '#fff',
              background: loading ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.28)',
              border: '1px solid rgba(99,102,241,0.3)', transition: 'all .2s ease',
              '&:hover': { background: 'linear-gradient(135deg, #5558e8 0%, #6d28d9 100%)', transform: 'translateY(-1px)' },
              '&.Mui-disabled': { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.04)' }
            }}>
            {loading ? 'Creating account...' : 'Create account →'}
          </Button>
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '.85rem' }}>
            Already have an account?{' '}
            <Box component="span" onClick={() => nav('/login')}
              sx={{ color: '#818cf8', cursor: 'pointer', '&:hover': { color: '#a5b4fc' }, transition: 'color .15s' }}>
              Sign in
            </Box>
          </Typography>
        </Box>

        <Typography sx={{ color: 'rgba(255,255,255,0.1)', fontSize: '.68rem', textAlign: 'center', mt: 4 }}>
          © 2026 NGXP OMNIX · Enterprise Vision Intelligence Platform
        </Typography>
      </Box>
    </Box>
  )
}