import { create } from 'zustand'
import { queryClient } from '@/lib/query-client'
import type { UserRole, Permissions } from '@/types/api'

const REFRESH_TOKEN_KEY = 'drakko-rt'

interface AuthState {
  accessToken: string | null
  username: string
  firstName: string
  lastName: string
  role: UserRole | null
  userId: string | null
  organizationId: string | null
  language: string
  theme: string
  accentColor: string
  navSlots: string[]
  permissions: Permissions | null
  customRoleName: string | null
  setAuth: (accessToken: string, username: string, refreshToken?: string) => void
  setUsername: (username: string) => void
  setName: (firstName: string, lastName: string) => void
  setPreferences: (language: string, theme: string, accentColor: string) => void
  setPermissions: (permissions: Permissions | null) => void
  setNavSlots: (navSlots: string[]) => void
  setCustomRoleName: (name: string | null) => void
  clearAuth: () => void
}

function decodeJwtPayload(
  token: string,
): { sub: string; role: UserRole; orgId: string } | null {
  try {
    const base64url = token.split('.')[1]
    if (!base64url) return null
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded)) as { sub: string; role: UserRole; orgId: string }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  username: sessionStorage.getItem('username') ?? '',
  firstName: sessionStorage.getItem('firstName') ?? '',
  lastName: sessionStorage.getItem('lastName') ?? '',
  role: null,
  userId: null,
  organizationId: null,
  language: 'fr',
  theme: 'system',
  accentColor: 'green',
  navSlots: [],
  permissions: null,
  customRoleName: null,

  setAuth: (accessToken, username, refreshToken) => {
    const decoded = decodeJwtPayload(accessToken)
    sessionStorage.setItem('username', username)
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({
      accessToken,
      username,
      role: decoded?.role ?? null,
      userId: decoded?.sub ?? null,
      organizationId: decoded?.orgId ?? null,
    })
  },

  setUsername: (username) => {
    sessionStorage.setItem('username', username)
    set({ username })
  },

  setName: (firstName, lastName) => {
    sessionStorage.setItem('firstName', firstName)
    sessionStorage.setItem('lastName', lastName)
    set({ firstName, lastName })
  },

  setPreferences: (language, theme, accentColor) => {
    set({ language, theme, accentColor })
  },

  setPermissions: (permissions) => {
    set({ permissions })
  },

  setNavSlots: (navSlots) => {
    set({ navSlots })
  },

  setCustomRoleName: (name) => {
    set({ customRoleName: name })
  },

  clearAuth: () => {
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('firstName')
    sessionStorage.removeItem('lastName')
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    // Ne jamais montrer à l'utilisateur suivant les données du précédent
    queryClient.clear()
    set({ accessToken: null, username: '', firstName: '', lastName: '', role: null, userId: null, organizationId: null, permissions: null, navSlots: [], customRoleName: null })
  },
}))

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}
