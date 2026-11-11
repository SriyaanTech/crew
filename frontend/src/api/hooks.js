import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, subscribe } from './client'

// Load one or more collections and keep them fresh when they change.
// const { crew, vessels, loading } = useData('crew', 'vessels')
export function useData(...resources) {
  const key = resources.filter(Boolean).join('|')
  const [state, setState] = useState(() => Object.fromEntries(resources.map((r) => [r, []])))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const load = useCallback(async (only) => {
    if (!key) { setLoading(false); return }
    const list = only ? [only] : key.split('|')
    // allSettled: if a role may not see one resource (403), the others still load
    const results = await Promise.allSettled(list.map((r) => api.list(r)))
    if (!mounted.current) return
    setState((s) => ({ ...s, ...Object.fromEntries(list.map((r, i) => [r, results[i].status === 'fulfilled' ? results[i].value : (s[r] || [])])) }))
    const failed = results.find((r) => r.status === 'rejected')
    setError(failed ? failed.reason?.message : null)
    setLoading(false)
  }, [key])

  useEffect(() => {
    mounted.current = true
    load()
    const unsub = subscribe((res) => {
      if (res === '*') load()
      else if (key.split('|').includes(res)) load(res)
    })
    return () => { mounted.current = false; unsub() }
  }, [key, load])

  return { ...state, loading, error, reload: load }
}

export function useConfig(key, enabled = true) {
  const [value, setValue] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const get = () => api.getObject(key).then((v) => alive && setValue(v)).catch(() => {})
    get()
    const unsub = subscribe((r) => (r === key || r === '*') && get())
    return () => { alive = false; unsub() }
  }, [key, enabled])
  const save = useCallback((v) => api.setObject(key, v), [key])
  return [value, save]
}

// Build id -> record lookup maps
export function useLookup(list) {
  return useMemo(() => Object.fromEntries((list || []).map((x) => [x.id, x])), [list])
}
