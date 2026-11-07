import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

// useSyncExternalStore is React's built-in way to read browser state that
// changes outside React. Caveat: `navigator.onLine === false` is reliable,
// but `true` only means "connected to a network", not "the server is reachable".
// That's why every screen also keeps its own error state for failed requests.
function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      You are offline. Records can't be loaded or uploaded until you reconnect.
    </div>
  )
}