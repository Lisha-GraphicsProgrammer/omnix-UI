import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'

interface User {
  id: number
  email: string
  name: string
  role: string
  site_id?: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('omnix_token')
    if (!token) {
      setLoading(false)
      return
    }
    apiGet('/api/auth/me')
      .then((data: User) => setUser(data))
      .catch(() => {
        localStorage.removeItem('omnix_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('omnix_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('omnix_token')
    setUser(null)
    nav('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}