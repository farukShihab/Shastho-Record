// Token storage tradeoff (worth explaining in your internship demo):
// Tokens live in a module variable (fast) AND in localStorage (survives page
// reloads). localStorage is readable by any JavaScript on the page, so an XSS
// bug could steal the tokens. The safer production setup is an httpOnly cookie
// for the refresh token, which JS cannot read, but that needs backend changes
// and CSRF handling. For this prototype, localStorage keeps things simple.

const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '')
const ACCESS_KEY = 'shastho.access'
const REFRESH_KEY = 'shastho.refresh'

let accessToken: string | null = localStorage.getItem(ACCESS_KEY)

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh?: string) {
    accessToken = access
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    accessToken = null
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// The wrapper lives outside React, so it can't call setUser directly.
// AuthContext registers a callback here to be told when the session dies.
let onAuthFailure: () => void = () => {}
export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn
}

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, data: unknown) {
    super(`API error ${status}`)
    this.status = status
    this.data = data
  }
}

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return null
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    tokenStore.set(data.access, data.refresh) // refresh only present if the server rotates it
    return data.access as string
  } catch {
    return null
  }
}

// If several requests get a 401 at once, they share ONE refresh call.
// Otherwise parallel refreshes could race (and fail if tokens are rotated).
let refreshing: Promise<string | null> | null = null
function refreshAccessToken() {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

type ApiInit = RequestInit & { auth?: boolean }

export async function apiFetch(path: string, init: ApiInit = {}): Promise<Response> {
  const { auth = true, ...rest } = init

  const send = () => {
    const headers = new Headers(rest.headers)
    if (auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    // For FormData the browser must set Content-Type itself (it adds the multipart boundary).
    if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(`${API_URL}${path}`, { ...rest, headers })
  }

  let res = await send()

  // auth:false (e.g. login) skips this: a 401 there just means wrong password.
  if (res.status === 401 && auth) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      res = await send() // retry exactly once
    }
    if (!newAccess || res.status === 401) {
      tokenStore.clear()
      onAuthFailure()
    }
  }
  return res
}

// Convenience: parse JSON and throw ApiError on non-2xx so callers can try/catch.
export async function apiJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data as T
}