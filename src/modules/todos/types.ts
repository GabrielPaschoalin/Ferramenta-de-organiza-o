export type Priority = 'alta' | 'media' | 'baixa'

export type Category = {
  id: string
  name: string
  createdAt: number
}

export type Task = {
  id: string
  title: string
  notes: string
  dueDate: string | null
  priority: Priority | null
  categoryId: string | null
  done: boolean
  createdAt: number
  completedAt: number | null
}

export type StatusFilter = 'todas' | 'hoje' | 'concluidas'
export type CategoryFilter = 'all' | 'none' | string
