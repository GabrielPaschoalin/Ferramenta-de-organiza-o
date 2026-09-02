import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { subscribeInvestments } from '@/modules/finance/investments/api'
import type { Investment } from '@/modules/finance/investments/types'

export function useInvestments() {
  const { user } = useAuth()
  const [items, setItems] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    return subscribeInvestments(
      user.uid,
      (next) => {
        setItems(next)
        setLoading(false)
      },
      (message) => {
        setError(message)
        setLoading(false)
      },
    )
  }, [user])

  return { user, items, loading, error }
}
