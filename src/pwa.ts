type CapacitorBridge = {
  isNativePlatform?: () => boolean
}

function isRunningInsideCapacitor() {
  const runtime = globalThis as typeof globalThis & {
    Capacitor?: CapacitorBridge
  }

  return runtime.Capacitor?.isNativePlatform?.() === true
}

export function registerPWA() {
  if (!import.meta.env.PROD) {
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  // Android mediante Capacitor conserva su funcionamiento actual.
  // La PWA se registra únicamente en la versión web publicada.
  if (isRunningInsideCapacitor()) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch((error: unknown) => {
        console.warn('No se pudo registrar la PWA:', error)
      })
  })
}