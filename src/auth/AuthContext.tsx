import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiJson, setAuthFailureHandler, tokenStore } from '../lib/api'
import type { LoginResponse, User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean // true while we check a stored session on first load
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuthFailureHandler(() => setUser(null))

    // Restore a session after a page reload: if we have tokens, ask /me/.
    if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
      setLoading(false)
      return
    }
    apiJson<User>('/api/auth/me/')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const data = await apiJson<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      auth: false,
    })
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}