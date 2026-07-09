import { useEffect, useState } from 'preact/hooks'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    const listener = () => setMatches(media.matches)
    listener()

    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
