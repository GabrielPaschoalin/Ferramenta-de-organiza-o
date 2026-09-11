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
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, inferCategoryKind } from '@/modules/finance/catalog'
import {
  dateInMonth,
  inferLegacyAccount,
  installmentIdentity,
  institutionToBank,
  invoiceDueDate,
  matchRule,
  methodFromAccount,
  normalizeText,
  replaceInstallmentLabel,
  shiftMonth,
  splitInstallmentAmounts,
  suggestPattern,
  todayISO,
} from '@/modules/finance/helpers'
import type {
  AccountInstitution,
  AccountType,
  CategoryGroup,
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseRule,
  ExpenseSource,
  ExpenseTransaction,
  FinanceAccount,
  PaymentMethod,
  TransactionInput,
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

function accountsCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'financeAccounts')
}

function asCategory(id: string, data: Record<string, unknown>): ExpenseCategory {
  const name = String(data.name ?? '')
  return {
    id,
    name,
    kind: data.kind === 'income' || data.kind === 'expense' ? data.kind : inferCategoryKind(name),
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
  return (
    value === 'expense' ||
    value === 'income' ||
    value === 'ignored' ||
    value === 'transfer' ||
    value === 'investment' ||
    value === 'adjustment'
  )
}

function isSource(value: unknown): value is ExpenseSource {
  return value === 'ofx' || value === 'csv' || value === 'pdf' || value === 'manual'
}

function isBank(value: unknown): value is ExpenseBank {
  return value === 'nubank' || value === 'inter' || value === 'beevale'
}

function isMethod(value: unknown): value is PaymentMethod {
  return value === 'credit' || value === 'debit' || value === 'vale'
}

function isInstitution(value: unknown): value is AccountInstitution {
  return value === 'nubank' || value === 'inter' || value === 'beevale' || value === 'other'
}

function isAccountType(value: unknown): value is AccountType {
  return (
    value === 'checking' ||
    value === 'payment' ||
    value === 'savings' ||
    value === 'cash' ||
    value === 'wallet' ||
    value === 'vale' ||
    value === 'credit'
  )
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

function optionalNumber(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function asAccount(id: string, data: Record<string, unknown>): FinanceAccount {
  return {
    id,
    name: String(data.name ?? 'Conta'),
    institution: isInstitution(data.institution) ? data.institution : 'other',
    type: isAccountType(data.type) ? data.type : 'checking',
    initialBalance: typeof data.initialBalance === 'number' ? data.initialBalance : 0,
    initialBalanceDate: String(data.initialBalanceDate ?? todayISO()),
    archived: data.archived === true,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    brand: optionalString(data.brand),
    lastFour: optionalString(data.lastFour),
    limit: optionalNumber(data.limit),
    closingDay: optionalNumber(data.closingDay),
    dueDay: optionalNumber(data.dueDay),
    paymentAccountId: optionalString(data.paymentAccountId),
  }
}

export function asTransaction(id: string, data: Record<string, unknown>): ExpenseTransaction {
  const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount)
  const bank = isBank(data.bank) ? data.bank : 'nubank'
  const method = isMethod(data.method)
    ? data.method
    : bank === 'beevale'
      ? 'vale'
      : 'debit'
  const date = String(data.date ?? '')
  return {
    id,
    date,
    paymentDate: String(data.paymentDate ?? data.competenceDate ?? date),
    amount: Number.isFinite(amount) ? amount : 0,
    description: String(data.description ?? ''),
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : null,
    kind: isKind(data.kind) ? data.kind : 'expense',
    source: isSource(data.source) ? data.source : 'manual',
    accountId: String(data.accountId ?? ''),
    destAccountId: optionalString(data.destAccountId),
    bank,
    method,
    externalId: String(data.externalId ?? id),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    merchant: optionalString(data.merchant),
    notes: optionalString(data.notes),
    hidden: data.hidden === true,
    installmentGroupId: optionalString(data.installmentGroupId),
    installmentCurrent: optionalNumber(data.installmentCurrent),
    installmentTotal: optionalNumber(data.installmentTotal),
    invoiceMonth: optionalString(data.invoiceMonth),
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

export function subscribeFinanceAccounts(
  uid: string,
  onData: (accounts: FinanceAccount[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(accountsCol(uid)),
    (snap) => {
      onData(
        snap.docs
          .map((item) => asAccount(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
    },
    (error) => onError(error.message),
  )
}

export async function addExpenseCategory(uid: string, name: string, kind: CategoryGroup = 'expense') {
  const trimmed = name.trim()
  if (!trimmed) return
  const ref = await addDoc(categoriesCol(uid), {
    name: trimmed,
    kind,
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
  const linked = await getDocs(query(transactionsCol(uid), where('categoryId', '==', categoryId)))
  const rules = await getDocs(query(rulesCol(uid), where('categoryId', '==', categoryId)))

  const batch = writeBatch(firestore)
  linked.forEach((item) => batch.update(item.ref, { categoryId: null }))
  rules.forEach((item) => batch.delete(item.ref))
  batch.delete(doc(firestore, 'users', uid, 'expenseCategories', categoryId))
  await batch.commit()
}

export type AccountInput = Omit<FinanceAccount, 'id' | 'createdAt'>

export async function addFinanceAccount(uid: string, input: AccountInput) {
  const ref = await addDoc(accountsCol(uid), {
    ...input,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updateFinanceAccount(
  uid: string,
  accountId: string,
  patch: Partial<AccountInput>,
) {
  await updateDoc(doc(requireDb(), 'users', uid, 'financeAccounts', accountId), patch)
}

export async function archiveFinanceAccount(uid: string, accountId: string) {
  await updateFinanceAccount(uid, accountId, { archived: true })
}

export async function addExpenseTransaction(uid: string, input: TransactionInput) {
  const ref = await addDoc(transactionsCol(uid), {
    ...input,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function addInstallmentPurchase(
  uid: string,
  input: TransactionInput,
  installments: number,
  invoiceMonths: string[],
  paymentDates: string[] = [],
) {
  const parts = splitInstallmentAmounts(input.amount, installments)
  const groupId = `inst-${Date.now()}`
  const firestore = requireDb()
  const now = Date.now()
  const batch = writeBatch(firestore)

  parts.forEach((amount, index) => {
    const invoiceMonth = invoiceMonths[index] ?? invoiceMonths[0] ?? input.date.slice(0, 7)
    batch.set(doc(transactionsCol(uid)), {
      ...input,
      amount,
      paymentDate: paymentDates[index] ?? input.paymentDate,
      installmentGroupId: groupId,
      installmentCurrent: index + 1,
      installmentTotal: installments,
      invoiceMonth,
      date: dateInMonth(invoiceMonth, Number(input.date.slice(8, 10)) || 1),
      externalId: `${input.externalId}:${index + 1}`,
      createdAt: now,
    })
  })

  await batch.commit()
  return groupId
}

export async function scheduleRemainingInstallments(
  uid: string,
  current: ExpenseTransaction,
  existing: ExpenseTransaction[],
  accounts: FinanceAccount[],
) {
  const from = current.installmentCurrent
  const total = current.installmentTotal
  if (!from || !total || from >= total) return

  const account = accounts.find((item) => item.id === current.accountId)
  const closingDay = account?.closingDay ?? 10
  const dueDay = account?.dueDay ?? 17
  const baseMonth = current.invoiceMonth || current.date.slice(0, 7)
  const day = Number(current.date.slice(8, 10)) || 1
  const groupId = current.installmentGroupId || `inst-${current.id}`
  const knownIds = new Set(existing.map((item) => item.externalId))
  const knownInstallments = new Set(
    existing.map(installmentIdentity).filter((item): item is string => Boolean(item)),
  )

  if (!current.installmentGroupId) {
    await updateExpenseTransaction(uid, current.id, { installmentGroupId: groupId })
  }

  const firestore = requireDb()
  const now = Date.now()
  const batch = writeBatch(firestore)
  let added = 0

  for (let index = from + 1; index <= total; index += 1) {
    const month = shiftMonth(baseMonth, index - from)
    const description = replaceInstallmentLabel(current.description, index, total)
    const externalId = `${current.externalId}:p${index}`
    const identity = installmentIdentity({
      accountId: current.accountId,
      description,
      amount: current.amount,
      installmentCurrent: index,
      installmentTotal: total,
    })
    if (knownIds.has(externalId) || (identity && knownInstallments.has(identity))) continue
    added += 1
    batch.set(doc(transactionsCol(uid)), {
      date: dateInMonth(month, day),
      paymentDate: invoiceDueDate(month, closingDay, dueDay),
      description,
      amount: current.amount,
      categoryId: current.categoryId,
      kind: current.kind,
      source: current.source,
      accountId: current.accountId,
      destAccountId: current.destAccountId,
      bank: current.bank,
      method: current.method,
      externalId,
      merchant: current.merchant,
      notes: current.notes,
      hidden: false,
      installmentGroupId: groupId,
      installmentCurrent: index,
      installmentTotal: total,
      invoiceMonth: month,
      createdAt: now,
    })
  }

  if (added === 0) return
  await batch.commit()
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
  const have = new Set(existing.map((item) => `${item.kind}:${normalizeText(item.name)}`))
  const created: ExpenseCategory[] = []

  for (const item of DEFAULT_CATEGORIES) {
    const key = `${item.kind}:${normalizeText(item.name)}`
    const sameName = existing.find((category) => normalizeText(category.name) === normalizeText(item.name))
    if (have.has(key) || sameName) continue
    const id = await addExpenseCategory(uid, item.name, item.kind)
    if (!id) continue
    created.push({ id, name: item.name, kind: item.kind, createdAt: Date.now() })
  }

  return [...existing, ...created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function ensureDefaultAccounts(
  uid: string,
  existing: FinanceAccount[],
  transactions: ExpenseTransaction[],
) {
  let accounts = existing
  if (accounts.length === 0) {
    const created: FinanceAccount[] = []
    const checkingByInstitution = new Map<string, string>()

    for (const item of DEFAULT_ACCOUNTS) {
      if (item.type === 'credit') continue
      const id = await addFinanceAccount(uid, {
        name: item.name,
        institution: item.institution,
        type: item.type,
        initialBalance: 0,
        initialBalanceDate: todayISO(),
        archived: false,
        brand: null,
        lastFour: null,
        limit: null,
        closingDay: item.closingDay ?? null,
        dueDay: item.dueDay ?? null,
        paymentAccountId: null,
      })
      if (!id) continue
      checkingByInstitution.set(item.institution, id)
      created.push({
        id,
        name: item.name,
        institution: item.institution,
        type: item.type,
        initialBalance: 0,
        initialBalanceDate: todayISO(),
        archived: false,
        createdAt: Date.now(),
        brand: null,
        lastFour: null,
        limit: null,
        closingDay: item.closingDay ?? null,
        dueDay: item.dueDay ?? null,
        paymentAccountId: null,
      })
    }

    for (const item of DEFAULT_ACCOUNTS) {
      if (item.type !== 'credit') continue
      const id = await addFinanceAccount(uid, {
        name: item.name,
        institution: item.institution,
        type: item.type,
        initialBalance: 0,
        initialBalanceDate: todayISO(),
        archived: false,
        brand: null,
        lastFour: null,
        limit: null,
        closingDay: item.closingDay ?? 10,
        dueDay: item.dueDay ?? 17,
        paymentAccountId: checkingByInstitution.get(item.institution) ?? null,
      })
      if (!id) continue
      created.push({
        id,
        name: item.name,
        institution: item.institution,
        type: item.type,
        initialBalance: 0,
        initialBalanceDate: todayISO(),
        archived: false,
        createdAt: Date.now(),
        brand: null,
        lastFour: null,
        limit: null,
        closingDay: item.closingDay ?? 10,
        dueDay: item.dueDay ?? 17,
        paymentAccountId: checkingByInstitution.get(item.institution) ?? null,
      })
    }
    accounts = created
  }

  const missing = transactions.filter((item) => !item.accountId)
  if (missing.length === 0) return accounts

  const firestore = requireDb()
  const chunkSize = 400
  for (let i = 0; i < missing.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    missing.slice(i, i + chunkSize).forEach((item) => {
      const account = inferLegacyAccount(accounts, item.bank, item.method)
      if (!account) return
      batch.update(doc(firestore, 'users', uid, 'expenseTransactions', item.id), {
        accountId: account.id,
        paymentDate: item.paymentDate || item.date,
        invoiceMonth: account.type === 'credit' ? item.date.slice(0, 7) : null,
      })
    })
    await batch.commit()
  }

  return accounts
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
  rows: Array<TransactionInput>,
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

export function accountPayload(account: FinanceAccount): AccountInput {
  return {
    name: account.name,
    institution: account.institution,
    type: account.type,
    initialBalance: account.initialBalance,
    initialBalanceDate: account.initialBalanceDate,
    archived: account.archived,
    brand: account.brand,
    lastFour: account.lastFour,
    limit: account.limit,
    closingDay: account.closingDay,
    dueDay: account.dueDay,
    paymentAccountId: account.paymentAccountId,
  }
}

export { institutionToBank, methodFromAccount }
