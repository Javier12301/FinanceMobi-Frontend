import { useEffect, useState } from 'react'

/** Suscribe a una media query. Ej: useMediaQuery('(min-width: 768px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True desde el breakpoint md de Tailwind (768px): layout de escritorio. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
