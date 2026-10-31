import { create } from 'zustand'
import type { PlatformAdmin } from './types'

// La session de la plateforme est à part de celle des clients (ADR-028) : son propre jeton, en mémoire seulement
// (le renouvellement passe par un cookie httpOnly que le script de la page ne lit pas), jamais mêlé à useAuthStore.
interface PlatformState {
  accessToken: string | null
  admin: PlatformAdmin | null
  setSession: (accessToken: string) => void
  setAdmin: (admin: PlatformAdmin) => void
  clear: () => void
}

export const usePlatformStore = create<PlatformState>((set) => ({
  accessToken: null,
  admin: null,
  setSession: (accessToken) => set({ accessToken }),
  setAdmin: (admin) => set({ admin }),
  clear: () => set({ accessToken: null, admin: null }),
}))
