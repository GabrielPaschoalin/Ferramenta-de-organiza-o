export type ExpenseKind = 'expense' | 'income' | 'transfer' | 'investment' | 'adjustment' | 'ignored'
export type ExpenseSource = 'ofx' | 'csv' | 'pdf' | 'manual'
export type ExpenseBank = 'nubank' | 'inter' | 'beevale'
export type PaymentMethod = 'credit' | 'debit' | 'vale'
export type ImportMode = 'statement' | 'invoice'

export type AccountInstitution = ExpenseBank | 'other'
export type AccountType =
  | 'checking'
  | 'payment'
  | 'savings'
  | 'cash'
  | 'wallet'
  | 'vale'
  | 'credit'

export type InvoiceStatus = 'open' | 'closed' | 'overdue' | 'paid'

export type CategoryGroup = 'income' | 'expense'

export type ExpenseCategory = {
  id: string
  name: string
  kind: CategoryGroup
  createdAt: number
}

export type ExpenseRule = {
  id: string
  pattern: string
  categoryId: string
  createdAt: number
}

export type FinanceAccount = {
  id: string
  name: string
  institution: AccountInstitution
  type: AccountType
  initialBalance: number
  initialBalanceDate: string
  archived: boolean
  createdAt: number
  brand: string | null
  lastFour: string | null
  limit: number | null
  closingDay: number | null
  dueDay: number | null
  paymentAccountId: string | null
}

export type ExpenseTransaction = {
  id: string
  date: string
  paymentDate: string
  description: string
  amount: number
  categoryId: string | null
  kind: ExpenseKind
  source: ExpenseSource
  accountId: string
  destAccountId: string | null
  bank: ExpenseBank
  method: PaymentMethod
  externalId: string
  createdAt: number
  merchant: string | null
  notes: string | null
  hidden: boolean
  installmentGroupId: string | null
  installmentCurrent: number | null
  installmentTotal: number | null
  invoiceMonth: string | null
}

export type TransactionInput = Omit<ExpenseTransaction, 'id' | 'createdAt'>

export type ParsedTransaction = {
  date: string
  amount: number
  description: string
  externalId: string
  source: 'ofx' | 'csv' | 'pdf'
}

export type StatementBalance = {
  amount: number
  date: string
}

export type ImportRow = ParsedTransaction & {
  kind: ExpenseKind
  categoryId: string | null
  accountId: string
  destAccountId: string | null
  bank: ExpenseBank
  method: PaymentMethod
  duplicate: boolean
  include: boolean
  installmentCurrent: number | null
  installmentTotal: number | null
  scheduleRemaining: boolean
  invoiceMonth: string | null
  paymentDate: string
}

export type AccountFilter = 'all' | string
export type CategoryFilter = 'all' | 'none' | string
export type KindFilter = 'all' | ExpenseKind

export type ExpenseListFilters = {
  categoryId: CategoryFilter
  accountId: AccountFilter
  kind: KindFilter
}

