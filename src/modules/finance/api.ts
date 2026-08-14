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
import { DEFAULT_CATEGORIES } from '@/modules/finance/catalog'
import { matchRule, normalizeText, suggestPattern } from '@/modules/finance/helpers'
import type {
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseRule,
  ExpenseSource,
  ExpenseTransaction,
  PaymentMethod,
} from '@/modules/finance/types'

function requireDb() {
  if (!db) {
    throw new Error('Firebase ainda não está configurado.')
  }
  return db
}

function categoriesCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'expenseCategories')
}

function rulesCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'expenseRules')
}

function transactionsCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'expenseTransactions')
}

function asCategory(id: string, data: Record<string, unknown>): ExpenseCategory {
  return {
    id,
    name: String(data.name ?? ''),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

function asRule(id: string, data: Record<string, unknown>): ExpenseRule {
  return {
    id,
    pattern: String(data.pattern ?? ''),
    categoryId: String(data.categoryId ?? ''),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

function isKind(value: unknown): value is ExpenseKind {
  return value === 'expense' || value === 'income' || value === 'ignored'
}

function isSource(value: unknown): value is ExpenseSource {
  return value === 'ofx' || value === 'csv' || value === 'manual'
}

function isBank(value: unknown): value is ExpenseBank {
  return value === 'nubank' || value === 'inter' || value === 'beevale'
}

function isMethod(value: unknown): value is PaymentMethod {
  return value === 'credit' || value === 'debit'
}

function asTransaction(id: string, data: Record<string, unknown>): ExpenseTransaction {
  const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount)
  return {
    id,
    date: String(data.date ?? ''),
    amount: Number.isFinite(amount) ? amount : 0,
    description: String(data.description ?? ''),
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : null,
    kind: isKind(data.kind) ? data.kind : 'expense',
    source: isSource(data.source) ? data.source : 'manual',
    bank: isBank(data.bank) ? data.bank : 'nubank',
    method: isMethod(data.method) ? data.method : 'debit',
    externalId: String(data.externalId ?? id),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

export function subscribeExpenseCategories(
  uid: string,
  onData: (categories: ExpenseCategory[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(categoriesCol(uid)),
    (snap) => {
      onData(
        snap.docs
          .map((item) => asCategory(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
    },
    (error) => onError(error.message),
  )
}

export function subscribeExpenseRules(
  uid: string,
  onData: (rules: ExpenseRule[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(rulesCol(uid)),
    (snap) => {
      onData(snap.docs.map((item) => asRule(item.id, item.data())))
    },
    (error) => onError(error.message),
  )
}

export function subscribeExpenseTransactions(
  uid: string,
  onData: (transactions: ExpenseTransaction[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(transactionsCol(uid)),
    (snap) => {
      onData(snap.docs.map((item) => asTransaction(item.id, item.data())))
    },
    (error) => onError(error.message),
  )
}

export async function addExpenseCategory(uid: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const ref = await addDoc(categoriesCol(uid), {
    name: trimmed,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function renameExpenseCategory(uid: string, categoryId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await updateDoc(doc(requireDb(), 'users', uid, 'expenseCategories', categoryId), {
    name: trimmed,
  })
}

export async function deleteExpenseCategory(uid: string, categoryId: string) {
  const firestore = requireDb()
  const linked = await getDocs(
    query(transactionsCol(uid), where('categoryId', '==', categoryId)),
  )
  const rules = await getDocs(query(rulesCol(uid), where('categoryId', '==', categoryId)))

  const batch = writeBatch(firestore)
  linked.forEach((item) => batch.update(item.ref, { categoryId: null }))
  rules.forEach((item) => batch.delete(item.ref))
  batch.delete(doc(firestore, 'users', uid, 'expenseCategories', categoryId))
  await batch.commit()
}

export async function addExpenseTransaction(
  uid: string,
  input: Omit<ExpenseTransaction, 'id' | 'createdAt'>,
) {
  const ref = await addDoc(transactionsCol(uid), {
    ...input,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updateExpenseTransaction(
  uid: string,
  transactionId: string,
  patch: Partial<Omit<ExpenseTransaction, 'id'>>,
) {
  await updateDoc(doc(requireDb(), 'users', uid, 'expenseTransactions', transactionId), patch)
}

export async function deleteExpenseTransaction(uid: string, transactionId: string) {
  await deleteDoc(doc(requireDb(), 'users', uid, 'expenseTransactions', transactionId))
}

export async function deleteExpenseTransactions(uid: string, transactionIds: string[]) {
  const firestore = requireDb()
  const chunkSize = 400
  for (let i = 0; i < transactionIds.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    transactionIds.slice(i, i + chunkSize).forEach((id) => {
      batch.delete(doc(firestore, 'users', uid, 'expenseTransactions', id))
    })
    await batch.commit()
  }
}

export async function ensureDefaultCategories(uid: string, existing: ExpenseCategory[]) {
  const have = new Set(existing.map((item) => normalizeText(item.name)))
  const created: ExpenseCategory[] = []

  for (const item of DEFAULT_CATEGORIES) {
    if (have.has(normalizeText(item.name))) continue
    const id = await addExpenseCategory(uid, item.name)
    if (!id) continue
    created.push({ id, name: item.name, createdAt: Date.now() })
  }

  return [...existing, ...created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function rememberCategoryRule(
  uid: string,
  description: string,
  categoryId: string,
  rules: ExpenseRule[],
) {
  const pattern = suggestPattern(description)
  if (!pattern || !categoryId) return

  const existing = rules.find((rule) => rule.pattern === pattern)
  if (existing) {
    if (existing.categoryId !== categoryId) {
      await updateDoc(doc(requireDb(), 'users', uid, 'expenseRules', existing.id), {
        categoryId,
      })
    }
    return
  }

  await addDoc(rulesCol(uid), {
    pattern,
    categoryId,
    createdAt: Date.now(),
  })
}

export async function importExpenseTransactions(
  uid: string,
  rows: Array<Omit<ExpenseTransaction, 'id' | 'createdAt'>>,
  rules: ExpenseRule[],
) {
  const firestore = requireDb()
  const now = Date.now()
  const pendingRules = new Map<string, string>()

  for (const row of rows) {
    if (!row.categoryId) continue
    if (matchRule(row.description, rules)) continue
    const pattern = suggestPattern(row.description)
    if (pattern && !pendingRules.has(pattern)) pendingRules.set(pattern, row.categoryId)
  }

  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = []

  for (const row of rows) {
    writes.push((batch) => {
      batch.set(doc(transactionsCol(uid)), { ...row, createdAt: now })
    })
  }

  for (const [pattern, categoryId] of pendingRules) {
    writes.push((batch) => {
      batch.set(doc(rulesCol(uid)), { pattern, categoryId, createdAt: now })
    })
  }

  const chunkSize = 400
  for (let i = 0; i < writes.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    writes.slice(i, i + chunkSize).forEach((write) => write(batch))
    await batch.commit()
  }
}
