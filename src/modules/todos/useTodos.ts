import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  subscribeCategories,
  subscribeTasks,
} from '@/modules/todos/api'
import type { Category, Task } from '@/modules/todos/types'

export function useTodos() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTasks([])
      setCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let remaining = 2
    const markReady = () => {
      remaining -= 1
      if (remaining <= 0) setLoading(false)
    }

    let tasksReady = false
    let categoriesReady = false

    const unsubTasks = subscribeTasks(
      user.uid,
      (next) => {
        setTasks(next)
        if (!tasksReady) {
          tasksReady = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!tasksReady) {
          tasksReady = true
          markReady()
        }
      },
    )

    const unsubCategories = subscribeCategories(
      user.uid,
      (next) => {
        setCategories(next)
        if (!categoriesReady) {
          categoriesReady = true
          markReady()
        }
      },
      (message) => {
        setError(message)
        if (!categoriesReady) {
          categoriesReady = true
          markReady()
        }
      },
    )

    return () => {
      unsubTasks()
      unsubCategories()
    }
  }, [user])

  return { user, tasks, categories, loading, error }
}
