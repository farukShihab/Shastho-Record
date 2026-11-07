import { useCallback, useEffect, useRef } from 'react'
import { ApiError, apiFetch } from './api'

// <img src> can't send an Authorization header, so we fetch the image ourselves
// with the token, turn the response into a Blob, and point the <img> at a
// temporary blob: URL made with URL.createObjectURL.
//
// Object URLs hold the image in memory until revoked, so this hook keeps one
// cache per screen (a Map of id -> Promise<url>) and revokes every URL when
// the screen unmounts. Caching the *promise* (not the URL) means two cards
// asking for the same image at the same time share one request.
export function useImageCache() {
  const state = useRef({ generation: 0, cache: new Map<number, Promise<string>>() })

  useEffect(() => {
    const s = state.current
    return () => {
      // Bump the generation so any request still in flight knows the screen is
      // gone and won't create a URL nobody will ever revoke.
      s.generation++
      s.cache.forEach((p) => p.then((url) => URL.revokeObjectURL(url)).catch(() => {}))
      s.cache.clear()
    }
  }, [])

  return useCallback((recordId: number): Promise<string> => {
    const s = state.current
    const hit = s.cache.get(recordId)
    if (hit) return hit

    const generation = s.generation
    const promise = (async () => {
      const res = await apiFetch(`/api/records/${recordId}/image/`)
      if (!res.ok) throw new ApiError(res.status, null)
      const blob = await res.blob()
      if (generation !== s.generation) throw new Error('cancelled')
      return URL.createObjectURL(blob)
    })()

    s.cache.set(recordId, promise)
    // On failure, drop the entry so a retry actually refetches.
    promise.catch(() => {
      if (s.cache.get(recordId) === promise) s.cache.delete(recordId)
    })
    return promise
  }, [])
}