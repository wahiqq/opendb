import { useEffect, useState } from 'react'

/**
 * Fallback tag list used only if the Airtable metadata fetch fails.
 * Keeps the UI functional if the backend is down or the token lacks
 * `schema.bases:read` scope. Source of truth is still Airtable.
 */
export const FALLBACK_TAG_OPTIONS = [
  'IECA', 'HECA', 'NACAC', 'WACAC', 'School', 'Community',
  'Homeschool', 'Counselor', 'Test Prep', 'Agent', 'No Tag',
]

// In-memory cache so we only hit the backend once per page session.
let cachedTags: string[] | null = null
let inflight: Promise<string[]> | null = null

async function fetchTags(): Promise<string[]> {
  if (cachedTags) return cachedTags
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const resp = await fetch('/api/tag-options')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const tags: string[] = Array.isArray(data.tags) && data.tags.length ? data.tags : FALLBACK_TAG_OPTIONS
      cachedTags = tags
      return tags
    } catch {
      cachedTags = FALLBACK_TAG_OPTIONS
      return FALLBACK_TAG_OPTIONS
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Invalidate the cache, e.g. after the user adds a new category. */
export function refreshTagOptions(): void {
  cachedTags = null
}

/**
 * Returns the list of tag options pulled live from Airtable's schema.
 * Falls back to a hardcoded list on error so the UI never breaks.
 */
export function useTagOptions(): { tags: string[]; loading: boolean } {
  const [tags, setTags] = useState<string[]>(cachedTags ?? FALLBACK_TAG_OPTIONS)
  const [loading, setLoading] = useState<boolean>(!cachedTags)

  useEffect(() => {
    let cancelled = false
    fetchTags().then((t) => {
      if (!cancelled) {
        setTags(t)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  return { tags, loading }
}
