'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const AdminFocusRefresh = () => {
  const router = useRouter()
  useEffect(() => {
    let lastRefresh = Date.now()
    const refresh = () => {
      if (
        document.visibilityState !== 'visible' ||
        Date.now() - lastRefresh < 30_000
      )
        return
      lastRefresh = Date.now()
      router.refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router])
  return null
}
