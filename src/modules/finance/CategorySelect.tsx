import { useState } from 'react'
import type { CategoryGroup, ExpenseCategory } from '@/modules/finance/types'

const CREATE = '__create__'
const CREATE_INCOME = '__create_income__'
const CREATE_EXPENSE = '__create_expense__'

export function CategorySelect({
  categories,
  value,
  onChange,
  onCreate,
  group = 'all',
  allowEmpty = true,
  emptyLabel = 'Sem categoria',
  extraOptions = [],
  disabled = false,
  className = 'w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest',
}: {
  categories: ExpenseCategory[]
  value: string
  onChange: (value: string) => void
  onCreate: (name: string, kind: CategoryGroup) => Promise<string | undefined>
  group?: CategoryGroup | 'all'
  allowEmpty?: boolean
  emptyLabel?: string
  extraOptions?: { value: string; label: string }[]
  disabled?: boolean
  className?: string
}) {
  const [creating, setCreating] = useState<CategoryGroup | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const income = categories.filter((item) => item.kind === 'income')
  const expense = categories.filter((item) => item.kind === 'expense')
  const visible =
    group === 'income' ? income : group === 'expense' ? expense : categories

  function handleSelect(next: string) {
    if (next === CREATE) {
      setCreating(group === 'income' ? 'income' : 'expense')
      setName('')
      return
    }
    if (next === CREATE_INCOME) {
      setCreating('income')
      setName('')
      return
    }
    if (next === CREATE_EXPENSE) {
      setCreating('expense')
      setName('')
      return
    }
    setCreating(null)
    onChange(next)
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed || !creating || saving) return
    setSaving(true)
    try {
      const id = await onCreate(trimmed, creating)
      if (id) onChange(id)
      setCreating(null)
      setName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={creating ? '' : value}
        disabled={disabled}
        onChange={(event) => handleSelect(event.target.value)}
        className={className}
      >
        {extraOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {group === 'all' ? (
          <>
            {expense.length > 0 ? (
              <optgroup label="Saída">
                {expense.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {income.length > 0 ? (
              <optgroup label="Entrada">
                {income.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <option value={CREATE_EXPENSE}>+ Nova categoria de saída</option>
            <option value={CREATE_INCOME}>+ Nova categoria de entrada</option>
          </>
        ) : (
          <>
            {visible.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value={CREATE}>
              {group === 'income' ? '+ Nova categoria de entrada' : '+ Nova categoria de saída'}
            </option>
          </>
        )}
      </select>
      {creating ? (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreate()
              }
            }}
            placeholder={creating === 'income' ? 'Nome da entrada' : 'Nome da saída'}
            className="h-10 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim()}
            className="rounded-xl bg-forest px-3 text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? '...' : 'Criar'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
