// Remplace `virtual:pwa-register/react` (module généré par vite-plugin-pwa, absent des tests)
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined] as const,
    offlineReady: [false, () => undefined] as const,
    updateServiceWorker: () => Promise.resolve(),
  }
}
