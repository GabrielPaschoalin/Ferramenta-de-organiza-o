export type ExpenseKind = 'expense' | 'income' | 'ignored'
export type ExpenseSource = 'ofx' | 'csv' | 'manual'
export type ExpenseBank = 'nubank' | 'inter' | 'beevale'
export type PaymentMethod = 'credit' | 'debit'

export type ExpenseCategory = {
  id: string
  name: string
  createdAt: number
}

export type ExpenseRule = {
  id: string
  pattern: string
  categoryId: string
  createdAt: number
}

export type ExpenseTransaction = {
  id: string
  date: string
  amount: number
  description: string
  categoryId: string | null
  kind: ExpenseKind
  source: ExpenseSource
  bank: ExpenseBank
  method: PaymentMethod
  externalId: string
  createdAt: number
}

export type ParsedTransaction = {
  date: string
  amount: number
  description: string
  externalId: string
  source: 'ofx' | 'csv'
}

export type ImportRow = ParsedTransaction & {
  kind: ExpenseKind
  categoryId: string | null
  bank: ExpenseBank
  method: PaymentMethod
  duplicate: boolean
  include: boolean
}
