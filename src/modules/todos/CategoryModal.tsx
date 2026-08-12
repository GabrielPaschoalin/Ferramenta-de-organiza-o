import { useState, type FormEvent } from 'react'
import { CloseIcon, TrashIcon } from '@/components/icons'
import type { Category } from '@/modules/todos/types'

export function CategoryModal({
  categories,
  onClose,
  onAdd,
  onRename,
  onDelete,
}: {
  categories: Category[]
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await onAdd(name)
    setName('')
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/25 p-4 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-serif text-xl text-ink">Categorias</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {categories.length === 0 ? (
            <li className="rounded-xl bg-paper px-3 py-3 text-sm text-muted">
              Nenhuma categoria ainda.
            </li>
          ) : (
            categories.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"
              >
                {editingId === item.id ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) void onRename(item.id, editingName)
                      setEditingId(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                    }}
                    className="h-9 flex-1 rounded-lg bg-paper px-2 text-sm outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id)
                      setEditingName(item.name)
                    }}
                    className="flex-1 text-left text-sm text-ink"
                  >
                    {item.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      `Apagar "${item.name}"? As tarefas ficam sem categoria.`,
                    )
                    if (ok) void onDelete(item.id)
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-clay"
                  aria-label={`Apagar ${item.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))
          )}
        </ul>

        <form onSubmit={(event) => void handleAdd(event)} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nova categoria"
            className="h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-xl bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50"
          >
            Criar
          </button>
        </form>
      </div>
    </div>
  )
}
