import type { Category, Task, TaskListFilters } from '@/modules/todos/types'

export function todayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDueDate(dueDate: string) {
  const date = new Date(`${dueDate}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function isOverdue(task: Task, today: string) {
  return !task.done && Boolean(task.dueDate) && task.dueDate! < today
}

export function filterTasks(tasks: Task[], filters: TaskListFilters) {
  return tasks
    .filter((task) => filters.showCompleted || !task.done)
    .filter((task) => {
      if (filters.categoryId === 'all') return true
      if (filters.categoryId === 'none') return !task.categoryId
      return task.categoryId === filters.categoryId
    })
    .filter((task) => {
      if (!filters.dueDate) return true
      return task.dueDate === filters.dueDate
    })
    .filter((task) => {
      if (filters.priority === 'all') return true
      if (filters.priority === 'none') return !task.priority
      return task.priority === filters.priority
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate)
      }
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return b.createdAt - a.createdAt
    })
}

export function categoryName(
  categories: Category[],
  categoryId: string | null,
) {
  if (!categoryId) return 'Sem categoria'
  return categories.find((item) => item.id === categoryId)?.name ?? 'Sem categoria'
}

export function hasActiveFilters(filters: TaskListFilters) {
  return (
    filters.categoryId !== 'all' ||
    Boolean(filters.dueDate) ||
    filters.priority !== 'all'
  )
}
