import { suggestCategoryName } from '@/modules/finance/catalog'
import type {
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseRule,
  ExpenseTransaction,
  ExpenseListFilters,
  ImportMode,
  ParsedTransaction,
  PaymentMethod,
} from '@/modules/finance/types'

export function currentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split('-').map(Number)
  const date = new Date(year, monthNum - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const label = new Date(year, monthNum - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function categoryName(
  categories: ExpenseCategory[],
  categoryId: string | null,
) {
  if (!categoryId) return 'Sem categoria'
  return categories.find((item) => item.id === categoryId)?.name ?? 'Sem categoria'
}

export function fingerprint(date: string, amount: number, description: string) {
  return `${date}|${amount.toFixed(2)}|${description.trim().toLowerCase()}`
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function suggestPattern(description: string) {
  const cleaned = normalizeText(description).replace(/[^a-z0-9 *._-]+/g, ' ').trim()
  const token = cleaned
    .split(' ')
    .find((part) => /[a-z]{3,}/.test(part.replace(/[^a-z]/g, '')))
  if (token) return token.replace(/^\*+|\*+$/g, '')
  return cleaned.slice(0, 24)
}

export function matchRule(description: string, rules: ExpenseRule[]) {
  const hay = normalizeText(description)
  const sorted = [...rules].sort((a, b) => b.pattern.length - a.pattern.length)
  return sorted.find((rule) => rule.pattern && hay.includes(rule.pattern))
}

export function kindFromAmount(amount: number): ExpenseKind {
  return amount < 0 ? 'expense' : 'income'
}

export function signedAmount(kind: ExpenseKind, absValue: number) {
  const value = Math.abs(absValue)
  if (kind === 'income') return value
  return -value
}

export function isInvoicePayment(description: string) {
  const hay = normalizeText(description)
  const patterns = [
    'pagamento de fatura',
    'pagamento fatura',
    'pagto fatura',
    'pag fatura',
    'pgto fatura',
    'fatura cartao',
    'fatura do cartao',
    'pagamento cartao',
    'pagto cartao',
    'pgto cartao',
    'pagamento da fatura',
    'debito fatura',
    'deb automatico fatura',
    'pagamento nubank',
    'pagamento inter',
  ]
  return patterns.some((pattern) => hay.includes(pattern))
}

export function transactionsInMonth(
  transactions: ExpenseTransaction[],
  month: string,
  filters: ExpenseListFilters = {
    categoryId: 'all',
    method: 'all',
    bank: 'all',
  },
) {
  return transactions
    .filter((item) => item.kind !== 'ignored' && item.date.startsWith(month))
    .filter((item) => {
      if (filters.categoryId === 'all') return true
      if (filters.categoryId === 'none') return !item.categoryId
      return item.categoryId === filters.categoryId
    })
    .filter((item) => {
      if (filters.method === 'all') return true
      if (filters.method === 'vale') return item.method === 'vale' || item.bank === 'beevale'
      return item.method === filters.method
    })
    .filter((item) => {
      if (filters.bank === 'all') return true
      return item.bank === filters.bank
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.createdAt - a.createdAt
    })
}

export function monthTotals(transactions: ExpenseTransaction[]) {
  let expenses = 0
  let income = 0
  for (const item of transactions) {
    if (item.kind === 'expense') expenses += Math.abs(item.amount)
    if (item.kind === 'income') income += Math.abs(item.amount)
  }
  return { expenses, income, balance: income - expenses }
}

export function totalsByCategory(
  transactions: ExpenseTransaction[],
  categories: ExpenseCategory[],
) {
  const map = new Map<string, number>()
  for (const item of transactions) {
    if (item.kind !== 'expense') continue
    const key = item.categoryId ?? ''
    map.set(key, (map.get(key) ?? 0) + Math.abs(item.amount))
  }

  return [...map.entries()]
    .map(([id, total]) => ({
      id,
      name: id ? categoryName(categories, id) : 'Sem categoria',
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export function existingIds(transactions: ExpenseTransaction[]) {
  return new Set(transactions.map((item) => item.externalId))
}

export function applyRules(
  parsed: ParsedTransaction[],
  rules: ExpenseRule[],
  categories: ExpenseCategory[],
  knownIds: Set<string>,
  bank: ExpenseBank,
  method: PaymentMethod,
  mode: ImportMode = 'statement',
) {
  return parsed.map((item) => {
    const duplicate = knownIds.has(item.externalId)
    const invoicePayment = mode === 'statement' && isInvoicePayment(item.description)
    const rule = matchRule(item.description, rules)
    const suggested = suggestCategoryName(item.description, bank)
    const suggestedId =
      suggested
        ? categories.find((category) => normalizeText(category.name) === normalizeText(suggested))
            ?.id ?? null
        : null
    const kind = invoicePayment ? 'ignored' : kindFromAmount(item.amount)
    const resolvedMethod = bank === 'beevale' ? 'vale' : method
    return {
      ...item,
      kind,
      categoryId: invoicePayment ? null : rule?.categoryId ?? suggestedId,
      bank,
      method: resolvedMethod,
      duplicate,
      include: !duplicate && !invoicePayment && kind === 'expense',
    }
  })
}
