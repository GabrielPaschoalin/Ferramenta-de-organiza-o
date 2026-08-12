import { useEffect, useState } from 'react'
import { CloseIcon, TrashIcon } from '@/components/icons'
import type { Category, Priority, Task } from '@/modules/todos/types'

const priorities: { id: Priority; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
]

export function TaskPanel({
  task,
  categories,
  onClose,
  onChange,
  onDelete,
  onAddCategory,
}: {
  task: Task
  categories: Category[]
  onClose: () => void
  onChange: (patch: Partial<Omit<Task, 'id'>>) => Promise<void>
  onDelete: () => Promise<void>
  onAddCategory: (name: string) => Promise<string | undefined>
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes)
  }, [task.id, task.title, task.notes])

  async function handleCreateCategory() {
    const name = newCategory.trim()
    if (!name || addingCategory) return
    setAddingCategory(true)
    try {
      const id = await onAddCategory(name)
      if (id) await onChange({ categoryId: id })
      setNewCategory('')
    } finally {
      setAddingCategory(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-xl text-ink">Tarefa</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Título
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                if (title.trim() && title.trim() !== task.title) {
                  void onChange({ title: title.trim() })
                }
              }}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Nota
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (notes !== task.notes) void onChange({ notes })
              }}
              rows={4}
              className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Prazo
            </span>
            <input
              type="date"
              value={task.dueDate ?? ''}
              onChange={(event) =>
                void onChange({ dueDate: event.target.value || null })
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Prioridade
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onChange({ priority: null })}
                className={[
                  'rounded-full px-3 py-1.5 text-sm',
                  task.priority === null
                    ? 'bg-forest text-paper'
                    : 'bg-paper text-muted',
                ].join(' ')}
              >
                Nenhuma
              </button>
              {priorities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void onChange({ priority: item.id })}
                  className={[
                    'rounded-full px-3 py-1.5 text-sm',
                    task.priority === item.id
                      ? 'bg-forest text-paper'
                      : 'bg-paper text-muted',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Categoria
              </span>
              <select
                value={task.categoryId ?? ''}
                onChange={(event) =>
                  void onChange({ categoryId: event.target.value || null })
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                <option value="">Sem categoria</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateCategory()
              }}
            >
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Nova categoria"
                className="h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-forest"
              />
              <button
                type="submit"
                disabled={addingCategory || !newCategory.trim()}
                className="rounded-xl bg-forest px-4 text-sm font-medium text-surface disabled:opacity-50"
              >
                Criar
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void onDelete()}
            className="inline-flex items-center gap-2 text-sm text-clay hover:underline"
          >
            <TrashIcon className="h-4 w-4" />
            Apagar tarefa
          </button>
        </div>
      </aside>
    </div>
  )
}
