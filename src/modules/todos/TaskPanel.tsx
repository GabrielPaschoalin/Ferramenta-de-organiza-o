import { useEffect, useRef, useState } from 'react'
import { CloseIcon, PlusIcon, TrashIcon } from '@/components/icons'
import type { Category, Priority, Task } from '@/modules/todos/types'

const priorities: { id: Priority; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
]

type Draft = {
  title: string
  notes: string
  dueDate: string | null
  priority: Priority | null
  categoryId: string | null
}

function draftFromTask(task: Task): Draft {
  return {
    title: task.title,
    notes: task.notes,
    dueDate: task.dueDate,
    priority: task.priority,
    categoryId: task.categoryId,
  }
}

export function TaskPanel({
  task,
  categories,
  onClose,
  onSave,
  onDelete,
  onAddCategory,
}: {
  task: Task
  categories: Category[]
  onClose: () => void
  onSave: (patch: Draft) => Promise<void>
  onDelete: () => Promise<void>
  onAddCategory: (name: string) => Promise<string | undefined>
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromTask(task))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(draftFromTask(task))
  }, [task.id])

  const dirty =
    draft.title !== task.title ||
    draft.notes !== task.notes ||
    draft.dueDate !== task.dueDate ||
    draft.priority !== task.priority ||
    draft.categoryId !== task.categoryId

  function requestClose() {
    if (dirty && !window.confirm('Descartar as alterações desta tarefa?')) return
    onClose()
  }

  async function handleSave() {
    const title = draft.title.trim()
    if (!title || saving) return
    setSaving(true)
    try {
      await onSave({
        ...draft,
        title,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/25" onClick={requestClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-xl text-ink">Tarefa</p>
          <button
            type="button"
            onClick={requestClose}
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
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Nota
            </span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Categoria
            </p>
            <CategoryPicker
              value={draft.categoryId}
              categories={categories}
              onChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
              onAddCategory={onAddCategory}
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Prazo
            </span>
            <input
              type="date"
              value={draft.dueDate ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  dueDate: event.target.value || null,
                }))
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
                onClick={() => setDraft((current) => ({ ...current, priority: null }))}
                className={[
                  'rounded-full px-3 py-1.5 text-sm',
                  draft.priority === null ? 'bg-forest text-paper' : 'bg-paper text-muted',
                ].join(' ')}
              >
                Nenhuma
              </button>
              {priorities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, priority: item.id }))}
                  className={[
                    'rounded-full px-3 py-1.5 text-sm',
                    draft.priority === item.id ? 'bg-forest text-paper' : 'bg-paper text-muted',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>


        </div>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !draft.title.trim()}
            className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
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

function CategoryPicker({
  value,
  categories,
  onChange,
  onAddCategory,
}: {
  value: string | null
  categories: Category[]
  onChange: (id: string | null) => void
  onAddCategory: (name: string) => Promise<string | undefined>
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const label =
    categories.find((item) => item.id === value)?.name ?? 'Sem categoria'

  useEffect(() => {
    if (!open) {
      setAdding(false)
      setName('')
      return
    }
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || pending) return
    setPending(true)
    try {
      const id = await onAddCategory(trimmed)
      if (id) {
        onChange(id)
        setAdding(false)
        setName('')
        setOpen(false)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-3 py-2.5 text-left text-sm text-ink outline-none focus:border-forest"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-muted">▾</span>
      </button>

      {open ? (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={[
                'block w-full px-3 py-2 text-left text-sm',
                value === null ? 'bg-paper font-medium text-ink' : 'text-ink hover:bg-paper',
              ].join(' ')}
            >
              Sem categoria
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
                className={[
                  'block w-full px-3 py-2 text-left text-sm',
                  value === item.id ? 'bg-paper font-medium text-ink' : 'text-ink hover:bg-paper',
                ].join(' ')}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="border-t border-line p-2">
            {adding ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleCreate()
                }}
              >
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nova categoria"
                  className="h-9 flex-1 rounded-lg border border-line bg-paper px-2 text-sm outline-none focus:border-forest"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={pending || !name.trim()}
                  className="rounded-lg bg-forest px-3 text-xs font-medium text-paper disabled:opacity-50"
                >
                  Criar
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-forest hover:bg-paper"
                aria-label="Nova categoria"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
