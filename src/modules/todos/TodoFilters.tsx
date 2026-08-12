import type { Category } from '@/modules/todos/types'
import type { CategoryFilter, StatusFilter } from '@/modules/todos/types'

const statusOptions: { id: StatusFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'concluidas', label: 'Concluídas' },
]

function chipClass(active: boolean) {
  return [
    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    active ? 'bg-forest text-paper' : 'bg-surface text-muted hover:text-ink',
  ].join(' ')
}

export function TodoFilters({
  status,
  category,
  categories,
  onStatus,
  onCategory,
  onManageCategories,
}: {
  status: StatusFilter
  category: CategoryFilter
  categories: Category[]
  onStatus: (value: StatusFilter) => void
  onCategory: (value: CategoryFilter) => void
  onManageCategories: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStatus(item.id)}
            className={chipClass(status === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCategory('all')}
          className={chipClass(category === 'all')}
        >
          Todas as categorias
        </button>
        <button
          type="button"
          onClick={() => onCategory('none')}
          className={chipClass(category === 'none')}
        >
          Sem categoria
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onCategory(item.id)}
            className={chipClass(category === item.id)}
          >
            {item.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onManageCategories}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface"
        >
          Categorias
        </button>
      </div>
    </div>
  )
}
