import { suggestCategoryName } from '@/modules/finance/catalog'
import type {
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseListFilters,
  ExpenseRule,
  ExpenseTransaction,
  FinanceAccount,
  ImportMode,
  ImportRow,
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

export function categoryName(categories: ExpenseCategory[], categoryId: string | null) {
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
  if (kind === 'income' || kind === 'adjustment') return value
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

export function parseInstallment(description: string) {
  const hay = normalizeText(description)
  const labeledSlash = hay.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})/)
  const labeledDe = hay.match(/parc(?:ela)?\.?\s*(\d{1,2})\s+de\s+(\d{1,2})/)
  const plain = hay.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/)
  const match = labeledSlash ?? labeledDe ?? plain
  if (!match) return null
  const current = Number(match[1])
  const total = Number(match[2])
  if (current < 1 || total < 2 || current > total || total > 48) return null
  return { current, total }
}

export function replaceInstallmentLabel(description: string, current: number, total: number) {
  if (/parc(?:ela)?\.?\s*\d{1,2}\s+de\s+\d{1,2}/i.test(description)) {
    return description.replace(/parc(?:ela)?\.?\s*\d{1,2}\s+de\s+\d{1,2}/i, `Parcela ${current} de ${total}`)
  }
  if (/parc(?:ela)?\.?\s*\d{1,2}\s*\/\s*\d{1,2}/i.test(description)) {
    return description.replace(/parc(?:ela)?\.?\s*\d{1,2}\s*\/\s*\d{1,2}/i, `Parcela ${current}/${total}`)
  }
  if (/\b\d{1,2}\s*\/\s*\d{1,2}\b/.test(description)) {
    return description.replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/, `${current}/${total}`)
  }
  return `${description} (Parcela ${current} de ${total})`
}

export function installmentIdentity(item: {
  accountId: string
  description: string
  amount: number
  installmentCurrent: number | null
  installmentTotal: number | null
}) {
  if (!item.installmentCurrent || !item.installmentTotal) return null
  const merchant = normalizeText(item.description)
    .replace(/parcela\s*\d+\s*(de|\/)\s*\d+/g, '')
    .replace(/\b\d+\s*\/\s*\d+\b/g, '')
    .trim()
  return `${item.accountId}|${merchant}|${item.installmentCurrent}|${item.installmentTotal}|${Math.abs(item.amount).toFixed(2)}`
}

export function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function addMonths(month: string, delta: number) {
  return shiftMonth(month, delta)
}

export function dateInMonth(month: string, day: number) {
  const [year, monthNum] = month.split('-').map(Number)
  const last = new Date(year, monthNum, 0).getDate()
  return `${year}-${pad2(monthNum)}-${pad2(Math.min(Math.max(day, 1), last))}`
}

export function isCreditAccount(account: FinanceAccount | null | undefined) {
  return account?.type === 'credit'
}

export function isCashLikeAccount(account: FinanceAccount | null | undefined) {
  return Boolean(account && account.type !== 'credit')
}

export function invoiceMonthForPurchase(purchaseDate: string, closingDay: number) {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  if (!year || !month || !day) return purchaseDate.slice(0, 7)
  if (day <= closingDay) return `${year}-${pad2(month)}`
  return shiftMonth(`${year}-${pad2(month)}`, 1)
}

export function invoiceClosingDate(invoiceMonth: string, closingDay: number) {
  return dateInMonth(invoiceMonth, closingDay)
}

export function invoiceDueDate(invoiceMonth: string, closingDay: number, dueDay: number) {
  if (dueDay >= closingDay) return dateInMonth(invoiceMonth, dueDay)
  return dateInMonth(shiftMonth(invoiceMonth, 1), dueDay)
}

export function invoiceStatus(
  invoiceMonth: string,
  dueDate: string,
  paid: boolean,
  today = todayISO(),
): 'open' | 'closed' | 'overdue' | 'paid' {
  if (paid) return 'paid'
  if (today > dueDate) return 'overdue'
  if (today.slice(0, 7) > invoiceMonth) return 'closed'
  return 'open'
}

export function splitInstallmentAmounts(total: number, count: number) {
  const cents = Math.round(Math.abs(total) * 100)
  const parts = Math.max(1, count)
  const base = Math.floor(cents / parts)
  const remainder = cents - base * parts
  return Array.from({ length: parts }, (_, index) => {
    const value = (index === parts - 1 ? base + remainder : base) / 100
    return total < 0 ? -value : value
  })
}

export function institutionToBank(institution: FinanceAccount['institution']): ExpenseBank {
  if (institution === 'inter' || institution === 'nubank' || institution === 'beevale') {
    return institution
  }
  return 'nubank'
}

export function methodFromAccount(account: FinanceAccount): PaymentMethod {
  if (account.type === 'credit') return 'credit'
  if (account.type === 'vale') return 'vale'
  return 'debit'
}

export function inferLegacyAccount(
  accounts: FinanceAccount[],
  bank: ExpenseBank,
  method: PaymentMethod,
) {
  const wantType =
    method === 'credit' ? 'credit' : method === 'vale' || bank === 'beevale' ? 'vale' : 'checking'
  return (
    accounts.find(
      (item) => !item.archived && item.institution === bank && item.type === wantType,
    ) ??
    accounts.find((item) => !item.archived && item.institution === bank) ??
    accounts.find((item) => !item.archived)
  )
}

export function accountById(accounts: FinanceAccount[], accountId: string | null | undefined) {
  if (!accountId) return null
  return accounts.find((item) => item.id === accountId) ?? null
}

export function resolveAccount(
  transaction: Pick<ExpenseTransaction, 'accountId' | 'bank' | 'method'>,
  accounts: FinanceAccount[],
) {
  return accountById(accounts, transaction.accountId) ?? inferLegacyAccount(accounts, transaction.bank, transaction.method)
}

export function visibleAccounts(accounts: FinanceAccount[]) {
  return accounts.filter((item) => !item.archived)
}

export function creditAccountForInstitution(
  accounts: FinanceAccount[],
  institution: FinanceAccount['institution'],
) {
  return accounts.find((item) => !item.archived && item.type === 'credit' && item.institution === institution) ?? null
}

export function paymentAccountForCard(accounts: FinanceAccount[], card: FinanceAccount) {
  return (
    accountById(accounts, card.paymentAccountId) ??
    accounts.find((item) => !item.archived && item.institution === card.institution && item.type !== 'credit') ??
    null
  )
}

export function isReportable(transaction: ExpenseTransaction) {
  return (
    !transaction.hidden &&
    transaction.kind !== 'ignored' &&
    transaction.kind !== 'transfer' &&
    transaction.kind !== 'investment' &&
    transaction.kind !== 'adjustment'
  )
}

export function movementForAccount(transaction: ExpenseTransaction, accountId: string) {
  if (transaction.hidden || transaction.kind === 'ignored') return 0
  if (transaction.kind === 'transfer') {
    if (transaction.accountId === accountId) return -Math.abs(transaction.amount)
    if (transaction.destAccountId === accountId) return Math.abs(transaction.amount)
    return 0
  }
  if (transaction.accountId !== accountId) return 0
  if (transaction.kind === 'income') return Math.abs(transaction.amount)
  if (transaction.kind === 'expense' || transaction.kind === 'investment') {
    return -Math.abs(transaction.amount)
  }
  if (transaction.kind === 'adjustment') return transaction.amount
  return 0
}

export function accountBalance(account: FinanceAccount, transactions: ExpenseTransaction[]) {
  let total = account.initialBalance
  for (const item of transactions) {
    total += movementForAccount(item, account.id)
  }
  return total
}

export function cashAvailable(accounts: FinanceAccount[], transactions: ExpenseTransaction[]) {
  return visibleAccounts(accounts)
    .filter((item) => isCashLikeAccount(item))
    .reduce((sum, item) => sum + accountBalance(item, transactions), 0)
}

export function cardDebt(account: FinanceAccount, transactions: ExpenseTransaction[]) {
  if (!isCreditAccount(account)) return 0
  return Math.max(0, -accountBalance(account, transactions))
}

export function cardRunningBalance(account: FinanceAccount, transactions: ExpenseTransaction[]) {
  let total = 0
  for (const item of transactions) {
    total += movementForAccount(item, account.id)
  }
  return total
}

export function accountMonthFlow(
  account: FinanceAccount,
  transactions: ExpenseTransaction[],
  month: string,
) {
  let inflow = 0
  let outflow = 0
  for (const item of transactions) {
    const date = item.paymentDate || item.date
    if (!date.startsWith(month)) continue
    const value = movementForAccount(item, account.id)
    if (value > 0) inflow += value
    if (value < 0) outflow += Math.abs(value)
  }
  return { inflow, outflow, net: inflow - outflow }
}

export function statementMonth(item: {
  invoiceMonth: string | null
  date: string
}) {
  return item.invoiceMonth || item.date.slice(0, 7)
}

export function invoiceItems(
  account: FinanceAccount,
  transactions: ExpenseTransaction[],
  month: string,
) {
  return transactions.filter((item) => {
    if (item.hidden || item.kind === 'ignored') return false
    if (item.accountId !== account.id) return false
    return statementMonth(item) === month
  })
}

export function invoiceTotal(
  account: FinanceAccount,
  transactions: ExpenseTransaction[],
  month: string,
) {
  return invoiceItems(account, transactions, month)
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + Math.abs(item.amount), 0)
}

export function invoicePaidAmount(
  account: FinanceAccount,
  transactions: ExpenseTransaction[],
  month: string,
) {
  return invoiceItems(account, transactions, month)
    .filter((item) => item.kind === 'transfer')
    .reduce((sum, item) => sum + Math.abs(item.amount), 0)
}

export function upcomingInvoices(
  accounts: FinanceAccount[],
  transactions: ExpenseTransaction[],
  fromMonth: string,
  count = 3,
) {
  const cards = visibleAccounts(accounts).filter(isCreditAccount)
  const months = Array.from({ length: count }, (_, index) => shiftMonth(fromMonth, index))
  return cards.flatMap((card) =>
    months.map((month) => {
      const closingDay = card.closingDay ?? 10
      const dueDay = card.dueDay ?? 17
      const dueDate = invoiceDueDate(month, closingDay, dueDay)
      const total = invoiceTotal(card, transactions, month)
      const paid = invoicePaidAmount(card, transactions, month)
      return {
        accountId: card.id,
        name: card.name,
        month,
        dueDate,
        total,
        paid,
        remaining: Math.max(0, total - paid),
        status: invoiceStatus(month, dueDate, paid >= total && total > 0),
      }
    }),
  )
}

export function transactionsForAccount(transactions: ExpenseTransaction[], accountId: string) {
  return transactions.filter((item) => {
    if (item.hidden || item.kind === 'ignored') return false
    return item.accountId === accountId || item.destAccountId === accountId
  })
}

export function transactionsInMonth(
  transactions: ExpenseTransaction[],
  month: string,
  filters: ExpenseListFilters = {
    categoryId: 'all',
    accountId: 'all',
    kind: 'all',
  },
  scope: 'date' | 'invoice' = 'date',
) {
  return transactions
    .filter((item) => item.kind !== 'ignored' && !item.hidden)
    .filter((item) => {
      if (scope === 'invoice') {
        return statementMonth(item) === month
      }
      return item.date.startsWith(month)
    })
    .filter((item) => {
      if (filters.categoryId === 'all') return true
      if (filters.categoryId === 'none') return !item.categoryId
      return item.categoryId === filters.categoryId
    })
    .filter((item) => {
      if (filters.accountId === 'all') return true
      return item.accountId === filters.accountId || item.destAccountId === filters.accountId
    })
    .filter((item) => {
      if (filters.kind === 'all') return true
      return item.kind === filters.kind
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.createdAt - a.createdAt
    })
}

export function monthTotals(transactions: ExpenseTransaction[]) {
  let expenses = 0
  let income = 0
  let investments = 0
  for (const item of transactions) {
    if (item.hidden || item.kind === 'ignored') continue
    if (item.kind === 'expense') expenses += Math.abs(item.amount)
    if (item.kind === 'income') income += Math.abs(item.amount)
    if (item.kind === 'investment') investments += Math.abs(item.amount)
  }
  return { expenses, income, investments, result: income - expenses }
}

export function shortMonthLabel(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const label = new Date(year, monthNum - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })
  return `${label.replace('.', '')}/${String(year).slice(2)}`
}

export function monthsInRange(fromMonth: string, toMonth: string) {
  const months: string[] = []
  let cursor = fromMonth
  while (cursor <= toMonth) {
    months.push(cursor)
    cursor = shiftMonth(cursor, 1)
    if (months.length > 36) break
  }
  return months
}

export function monthlyKindTotals(
  transactions: ExpenseTransaction[],
  kind: 'income' | 'expense',
  fromMonth: string,
  toMonth: string,
) {
  return monthsInRange(fromMonth, toMonth).map((month) => {
    let total = 0
    for (const item of transactions) {
      if (item.hidden || item.kind !== kind) continue
      if (!item.date.startsWith(month)) continue
      total += Math.abs(item.amount)
    }
    return { month, label: shortMonthLabel(month), total }
  })
}

export function totalsByCategory(
  transactions: ExpenseTransaction[],
  categories: ExpenseCategory[],
  kind: 'expense' | 'income' = 'expense',
) {
  const map = new Map<string, number>()
  for (const item of transactions) {
    if (item.kind !== kind || !isReportable(item)) continue
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
  account: FinanceAccount,
  accounts: FinanceAccount[],
  mode: ImportMode = 'statement',
  invoiceMonth = currentMonth(),
  existing: ExpenseTransaction[] = [],
): ImportRow[] {
  const bank = institutionToBank(account.institution)
  const method = methodFromAccount(account)
  const destCredit = creditAccountForInstitution(accounts, account.institution)
  const closingDay = account.closingDay ?? destCredit?.closingDay ?? 10
  const dueDay = account.dueDay ?? destCredit?.dueDay ?? 17
  const knownInstallments = new Set(
    existing.map(installmentIdentity).filter((item): item is string => Boolean(item)),
  )

  return parsed.map((item) => {
    const previous = item as ParsedTransaction & Partial<ImportRow>
    const invoicePayment = mode === 'statement' && isInvoicePayment(item.description)
    const rule = matchRule(item.description, rules)
    const installment =
      parseInstallment(item.description) ??
      (previous.installmentCurrent && previous.installmentTotal
        ? { current: previous.installmentCurrent, total: previous.installmentTotal }
        : null)
    const kind: ExpenseKind = invoicePayment
      ? 'transfer'
      : kindFromAmount(item.amount)
    const suggested = suggestCategoryName(
      item.description,
      bank,
      kind === 'income' ? 'income' : 'expense',
    )
    const suggestedId = suggested
      ? categories.find(
          (category) =>
            normalizeText(category.name) === normalizeText(suggested) &&
            (kind === 'income' ? category.kind === 'income' : category.kind === 'expense'),
        )?.id ?? null
      : null
    const destAccountId = invoicePayment ? destCredit?.id ?? null : null
    const resolvedInvoiceMonth =
      mode === 'invoice'
        ? invoiceMonth
        : isCreditAccount(account)
          ? invoiceMonthForPurchase(item.date, closingDay)
          : null
    const paymentDate =
      mode === 'invoice' || isCreditAccount(account)
        ? invoiceDueDate(resolvedInvoiceMonth || invoiceMonth, closingDay, dueDay)
        : item.date
    const identity = installmentIdentity({
      accountId: account.id,
      description: item.description,
      amount: item.amount,
      installmentCurrent: installment?.current ?? null,
      installmentTotal: installment?.total ?? null,
    })
    const duplicate = knownIds.has(item.externalId) || (identity ? knownInstallments.has(identity) : false)
    const remaining = Boolean(installment && installment.current < installment.total)

    return {
      ...item,
      date: item.date,
      kind,
      categoryId: invoicePayment ? null : rule?.categoryId ?? suggestedId,
      accountId: account.id,
      destAccountId,
      bank,
      method,
      duplicate,
      include: !duplicate,
      installmentCurrent: installment?.current ?? null,
      installmentTotal: installment?.total ?? null,
      scheduleRemaining: previous.scheduleRemaining ?? remaining,
      invoiceMonth: resolvedInvoiceMonth,
      paymentDate,
    }
  })
}

export function expandScheduledInstallments(
  rows: ImportRow[],
  accounts: FinanceAccount[],
  existing: ExpenseTransaction[] = [],
): ImportRow[] {
  const knownIds = new Set(existing.map((item) => item.externalId))
  const knownInstallments = new Set(
    existing.map(installmentIdentity).filter((item): item is string => Boolean(item)),
  )
  const extra: ImportRow[] = []

  for (const row of rows) {
    const current = row.installmentCurrent
    const total = row.installmentTotal
    if (!row.include || row.duplicate || !row.scheduleRemaining || !current || !total || current >= total) {
      continue
    }
    const account = accountById(accounts, row.accountId)
    const closingDay = account?.closingDay ?? 10
    const dueDay = account?.dueDay ?? 17
    const baseMonth = row.invoiceMonth || row.date.slice(0, 7)
    const day = Number(row.date.slice(8, 10)) || 1

    for (let index = current + 1; index <= total; index += 1) {
      const month = shiftMonth(baseMonth, index - current)
      const description = replaceInstallmentLabel(row.description, index, total)
      const externalId = `${row.externalId}:p${index}`
      const identity = installmentIdentity({
        accountId: row.accountId,
        description,
        amount: row.amount,
        installmentCurrent: index,
        installmentTotal: total,
      })
      if (knownIds.has(externalId) || (identity && knownInstallments.has(identity))) continue
      extra.push({
        ...row,
        date: dateInMonth(month, day),
        paymentDate: invoiceDueDate(month, closingDay, dueDay),
        description,
        externalId,
        invoiceMonth: month,
        installmentCurrent: index,
        installmentTotal: total,
        scheduleRemaining: false,
        duplicate: false,
        include: true,
      })
    }
  }

  return [...rows, ...extra]
}

export function accountLabel(accounts: FinanceAccount[], accountId: string | null) {
  if (!accountId) return 'Sem conta'
  return accounts.find((item) => item.id === accountId)?.name ?? 'Sem conta'
}

export function kindLabel(kind: ExpenseKind) {
  if (kind === 'income') return 'Receita'
  if (kind === 'transfer') return 'Transferência'
  if (kind === 'investment') return 'Investimento'
  if (kind === 'adjustment') return 'Ajuste'
  if (kind === 'ignored') return 'Ignorado'
  return 'Gasto'
}
