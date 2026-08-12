import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Category, Priority, Task } from '@/modules/todos/types'

function requireDb() {
  if (!db) {
    throw new Error('Firebase ainda não está configurado.')
  }
  return db
}

function tasksCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'tasks')
}

function categoriesCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'categories')
}

function asTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title: String(data.title ?? ''),
    notes: String(data.notes ?? ''),
    dueDate: typeof data.dueDate === 'string' ? data.dueDate : null,
    priority: isPriority(data.priority) ? data.priority : null,
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : null,
    done: Boolean(data.done),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    completedAt: typeof data.completedAt === 'number' ? data.completedAt : null,
  }
}

function asCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: String(data.name ?? ''),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

function isPriority(value: unknown): value is Priority {
  return value === 'alta' || value === 'media' || value === 'baixa'
}

export function subscribeTasks(
  uid: string,
  onData: (tasks: Task[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(tasksCol(uid)),
    (snap) => {
      const tasks = snap.docs.map((item) => asTask(item.id, item.data()))
      onData(tasks)
    },
    (error) => onError(error.message),
  )
}

export function subscribeCategories(
  uid: string,
  onData: (categories: Category[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(categoriesCol(uid)),
    (snap) => {
      const categories = snap.docs
        .map((item) => asCategory(item.id, item.data()))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      onData(categories)
    },
    (error) => onError(error.message),
  )
}

export async function addTask(uid: string, title: string) {
  const trimmed = title.trim()
  if (!trimmed) return

  await addDoc(tasksCol(uid), {
    title: trimmed,
    notes: '',
    dueDate: null,
    priority: null,
    categoryId: null,
    done: false,
    createdAt: Date.now(),
    completedAt: null,
  })
}

export async function updateTask(
  uid: string,
  taskId: string,
  patch: Partial<Omit<Task, 'id'>>,
) {
  await updateDoc(doc(requireDb(), 'users', uid, 'tasks', taskId), patch)
}

export async function deleteTask(uid: string, taskId: string) {
  await deleteDoc(doc(requireDb(), 'users', uid, 'tasks', taskId))
}

export async function addCategory(uid: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return

  const ref = await addDoc(categoriesCol(uid), {
    name: trimmed,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function renameCategory(uid: string, categoryId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return

  await updateDoc(doc(requireDb(), 'users', uid, 'categories', categoryId), {
    name: trimmed,
  })
}

export async function deleteCategory(uid: string, categoryId: string) {
  const firestore = requireDb()
  const linked = await getDocs(
    query(tasksCol(uid), where('categoryId', '==', categoryId)),
  )

  const batch = writeBatch(firestore)
  linked.forEach((item) => {
    batch.update(item.ref, { categoryId: null })
  })
  batch.delete(doc(firestore, 'users', uid, 'categories', categoryId))
  await batch.commit()
}
