import type { Category, Task } from '@/modules/todos/types'
import { categoryName, formatDueDate, isOverdue } from '@/modules/todos/helpers'

const priorityLabel = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
} as const

const priorityClass = {
  alta: 'text-clay',
  media: 'text-alert',
  baixa: 'text-muted',
} as const

export function TaskRow({
  task,
  categories,
  today,
  onToggle,
  onOpen,
}: {
  task: Task
  categories: Category[]
  today: string
  onToggle: () => void
  onOpen: () => void
}) {
  const overdue = isOverdue(task, today)

  return (
    <li>
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          className={[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
            task.done
              ? 'border-success bg-success text-surface'
              : 'border-line bg-paper text-transparent',
          ].join(' ')}
          aria-label={task.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
        >
          <span className="text-[11px] leading-none">✓</span>
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p
            className={[
              'text-sm font-medium',
              task.done ? 'text-muted line-through' : 'text-ink',
            ].join(' ')}
          >
            {task.title}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span>{categoryName(categories, task.categoryId)}</span>
            {task.dueDate ? (
              <span className={overdue ? 'text-alert' : undefined}>
                {overdue ? 'Atrasada · ' : ''}
                {formatDueDate(task.dueDate)}
              </span>
            ) : null}
            {task.priority ? (
              <span className={priorityClass[task.priority]}>
                {priorityLabel[task.priority]}
              </span>
            ) : null}
          </p>
        </button>
      </div>
    </li>
  )
}
