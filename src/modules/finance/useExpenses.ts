import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  ensureDefaultAccounts,
  subscribeExpenseCategories,
  subscribeExpenseRules,
  subscribeExpenseTransactions,
  subscribeFinanceAccounts,
} from '@/modules/finance/api'
import type {
  ExpenseCategory,
  ExpenseRule,
  ExpenseTransaction,
  FinanceAccount,
} from '@/modules/finance/types'

export function useExpenses() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [rules, setRules] = useState<ExpenseRule[]>([])
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTransactions([])
      setCategories([])
      setRules([])
      setAccounts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let remaining = 4
    const markReady = () => {
      remaining -= 1
      if (remaining <= 0) setLoading(false)
    }

    const ready = { transactions: false, categories: false, rules: false, accounts: false }

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

    const unsubAccounts = subscribeFinanceAccounts(
      user.uid,
      (next) => {
        setAccounts(next)
        if (!ready.accounts) {
          ready.accounts = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!ready.accounts) {
          ready.accounts = true
          markReady()
        }
      },
    )

    return () => {
      unsubTransactions()
      unsubCategories()
      unsubRules()
      unsubAccounts()
    }
  }, [user])

  const seeded = useRef(false)

  useEffect(() => {
    if (!user || loading) return
    const missingLinks = transactions.some((item) => !item.accountId)
    if (accounts.length > 0 && !missingLinks) return
    if (accounts.length === 0 && seeded.current) return
    if (accounts.length === 0) seeded.current = true
    void ensureDefaultAccounts(user.uid, accounts, transactions).catch((err: unknown) => {
      seeded.current = false
      setError(err instanceof Error ? err.message : 'Não foi possível criar as contas.')
    })
  }, [user, loading, accounts, transactions])

  return { user, transactions, categories, rules, accounts, loading, error }
}
