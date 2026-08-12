import { useMemo, useState } from 'react'
import {
  addCategory,
  addTask,
  deleteCategory,
  deleteTask,
  renameCategory,
  updateTask,
} from '@/modules/todos/api'
import { CategoryModal } from '@/modules/todos/CategoryModal'
import { QuickAdd } from '@/modules/todos/QuickAdd'
import { TaskPanel } from '@/modules/todos/TaskPanel'
import { TaskRow } from '@/modules/todos/TaskRow'
import { TodoFilters } from '@/modules/todos/TodoFilters'
import { filterTasks, todayISO } from '@/modules/todos/helpers'
import { useTodos } from '@/modules/todos/useTodos'
import type { CategoryFilter, StatusFilter, Task } from '@/modules/todos/types'

export function TodosPage() {
  const { user, tasks, categories, loading, error } = useTodos()
  const [status, setStatus] = useState<StatusFilter>('todas')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manageCategories, setManageCategories] = useState(false)
  const today = todayISO()

  const visible = useMemo(
    () => filterTasks(tasks, status, category, today),
    [tasks, status, category, today],
  )

  const selected = tasks.find((task) => task.id === selectedId) ?? null

  async function handleAdd(title: string) {
    if (!user) return
    await addTask(user.uid, title)
  }

  async function handleToggle(task: Task) {
    if (!user) return
    await updateTask(user.uid, task.id, {
      done: !task.done,
      completedAt: task.done ? null : Date.now(),
    })
  }

  async function handleChange(patch: Partial<Omit<Task, 'id'>>) {
    if (!user || !selected) return
    await updateTask(user.uid, selected.id, patch)
  }

  async function handleDelete() {
    if (!user || !selected) return
    await deleteTask(user.uid, selected.id)
    setSelectedId(null)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-forest">
        Tarefas
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink md:text-4xl">O que precisa ser feito</h1>
      <p className="mt-2 text-muted">
        Uma lista, com categorias que você cria. Sincroniza entre seus dispositivos.
      </p>

      <div className="mt-6">
        <QuickAdd onAdd={handleAdd} />
      </div>

      <div className="mt-5">
        <TodoFilters
          status={status}
          category={category}
          categories={categories}
          onStatus={setStatus}
          onCategory={setCategory}
          onManageCategories={() => setManageCategories(true)}
        />
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay">
          Não foi possível carregar as tarefas. Confira se o Firestore está criado e se as
          regras foram publicadas.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Carregando...</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
              {tasks.length === 0
                ? 'Nada por aqui. Adicione a primeira tarefa.'
                : 'Nenhuma tarefa neste filtro.'}
            </li>
          ) : (
            visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                categories={categories}
                today={today}
                onToggle={() => void handleToggle(task)}
                onOpen={() => setSelectedId(task.id)}
              />
            ))
          )}
        </ul>
      )}

      {selected ? (
        <TaskPanel
          task={selected}
          categories={categories}
          onClose={() => setSelectedId(null)}
          onChange={handleChange}
          onDelete={handleDelete}
          onAddCategory={async (name) => {
            if (!user) return
            return addCategory(user.uid, name)
          }}
        />
      ) : null}

      {manageCategories && user ? (
        <CategoryModal
          categories={categories}
          onClose={() => setManageCategories(false)}
          onAdd={async (name) => {
            await addCategory(user.uid, name)
          }}
          onRename={(id, name) => renameCategory(user.uid, id, name)}
          onDelete={(id) => deleteCategory(user.uid, id)}
        />
      ) : null}
    </div>
  )
}
