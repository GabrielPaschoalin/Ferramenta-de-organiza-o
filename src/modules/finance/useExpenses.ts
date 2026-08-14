import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  subscribeExpenseCategories,
  subscribeExpenseRules,
  subscribeExpenseTransactions,
} from '@/modules/finance/api'
import type {
  ExpenseCategory,
  ExpenseRule,
  ExpenseTransaction,
} from '@/modules/finance/types'

export function useExpenses() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [rules, setRules] = useState<ExpenseRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTransactions([])
      setCategories([])
      setRules([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let remaining = 3
    const markReady = () => {
      remaining -= 1
      if (remaining <= 0) setLoading(false)
    }

    const ready = { transactions: false, categories: false, rules: false }

    const unsubTransactions = subscribeExpenseTransactions(
      user.uid,
      (next) => {
        setTransactions(next)
        if (!ready.transactions) {
          ready.transactions = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!ready.transactions) {
          ready.transactions = true
          markReady()
        }
      },
    )

    const unsubCategories = subscribeExpenseCategories(
      user.uid,
      (next) => {
        setCategories(next)
        if (!ready.categories) {
          ready.categories = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!ready.categories) {
          ready.categories = true
          markReady()
        }
      },
    )

    const unsubRules = subscribeExpenseRules(
      user.uid,
      (next) => {
        setRules(next)
        if (!ready.rules) {
          ready.rules = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!ready.rules) {
          ready.rules = true
          markReady()
        }
      },
    )

    return () => {
      unsubTransactions()
      unsubCategories()
      unsubRules()
    }
  }, [user])

  return { user, transactions, categories, rules, loading, error }
}
