import { useEffect, useRef, useState } from 'react'
import { FilterIcon } from '@/components/icons'
import { hasActiveFilters } from '@/modules/todos/helpers'
import type { Category, TaskListFilters } from '@/modules/todos/types'

const priorities: { id: TaskListFilters['priority']; label: string }[] = [
  { id: 'all', label: 'Qualquer' },
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
  { id: 'none', label: 'Sem prioridade' },
]

export function TodoFilters({
  filters,
  categories,
  onChange,
  onManageCategories,
}: {
  filters: TaskListFilters
  categories: Category[]
  onChange: (next: TaskListFilters) => void
  onManageCategories: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = hasActiveFilters(filters)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function patch(partial: Partial<TaskListFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => patch({ showCompleted: !filters.showCompleted })}
        className={[
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          filters.showCompleted
            ? 'bg-forest text-paper'
            : 'bg-surface text-muted hover:text-ink',
        ].join(' ')}
      >
        Mostrar concluídas
      </button>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={[
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            open || active
              ? 'bg-forest text-paper'
              : 'bg-surface text-muted hover:text-ink',
          ].join(' ')}
          aria-expanded={open}
          aria-label="Filtros"
        >
          <FilterIcon className="h-4 w-4" />
          Filtro
        </button>

        {open ? (
          <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,20rem)] space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-xl">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Categoria
              </span>
              <select
                value={filters.categoryId}
                onChange={(event) =>
                  patch({ categoryId: event.target.value as TaskListFilters['categoryId'] })
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                <option value="all">Todas</option>
                <option value="none">Sem categoria</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Data
              </span>
              <input
                type="date"
                value={filters.dueDate}
                onChange={(event) => patch({ dueDate: event.target.value })}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Prioridade
              </span>
              <select
                value={filters.priority}
                onChange={(event) =>
                  patch({
                    priority: event.target.value as TaskListFilters['priority'],
                  })
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                {priorities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={onManageCategories}
                className="text-sm font-medium text-forest"
              >
                Categorias
              </button>
              {active ? (
                <button
                  type="button"
                  onClick={() =>
                    patch({ categoryId: 'all', dueDate: '', priority: 'all' })
                  }
                  className="text-sm text-muted hover:text-ink"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
