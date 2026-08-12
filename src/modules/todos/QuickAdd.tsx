import { useState, type FormEvent } from 'react'
import { PlusIcon } from '@/components/icons'

export function QuickAdd({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || pending) return
    setPending(true)
    try {
      await onAdd(title)
      setTitle('')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Nova tarefa"
        className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-forest"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        aria-label="Adicionar tarefa"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </form>
  )
}
