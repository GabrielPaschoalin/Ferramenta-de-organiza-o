import type {
  AccountInstitution,
  AccountType,
  ExpenseBank,
  PaymentMethod,
} from '@/modules/finance/types'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export const BANKS: { id: ExpenseBank; label: string }[] = [
  { id: 'nubank', label: 'Nubank' },
  { id: 'inter', label: 'Inter' },
  { id: 'beevale', label: 'BeeVale' },
]

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'vale', label: 'Vale' },
]

export const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: 'checking', label: 'Conta corrente' },
  { id: 'payment', label: 'Conta digital' },
  { id: 'savings', label: 'Poupança' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'wallet', label: 'Carteira digital' },
  { id: 'vale', label: 'Vale' },
  { id: 'credit', label: 'Cartão de crédito' },
]

export const INSTITUTIONS: { id: AccountInstitution; label: string }[] = [
  { id: 'nubank', label: 'Nubank' },
  { id: 'inter', label: 'Inter' },
  { id: 'beevale', label: 'BeeVale' },
  { id: 'other', label: 'Outra' },
]

export type DefaultAccountSeed = {
  name: string
  institution: AccountInstitution
  type: AccountType
  closingDay?: number
  dueDay?: number
}

export const DEFAULT_ACCOUNTS: DefaultAccountSeed[] = [
  { name: 'Inter', institution: 'inter', type: 'checking' },
  { name: 'Cartão Inter', institution: 'inter', type: 'credit', closingDay: 10, dueDay: 17 },
  { name: 'Nubank', institution: 'nubank', type: 'checking' },
  { name: 'Cartão Nubank', institution: 'nubank', type: 'credit', closingDay: 10, dueDay: 17 },
  { name: 'BeeVale', institution: 'beevale', type: 'vale' },
]

export const DEFAULT_INCOME_CATEGORIES: { name: string; keywords: string[] }[] = [
  {
    name: 'Salário',
    keywords: ['salario', 'folha', 'proventos', 'pagamento salario'],
  },
  {
    name: 'Renda extra',
    keywords: ['renda extra', 'freelance', 'bico'],
  },
  {
    name: 'Reembolso',
    keywords: ['reembolso', 'estorno', 'devolucao'],
  },
  {
    name: 'Rendimentos',
    keywords: ['rendimento', 'juros', 'cashback', 'dividendos'],
  },
]

export const DEFAULT_EXPENSE_CATEGORIES: { name: string; keywords: string[] }[] = [
  {
    name: 'Alimentação',
    keywords: [
      'ifood',
      'rappi',
      'ubereats',
      'uber eats',
      'restaurante',
      'padaria',
      'mercado',
      'supermercado',
      'carrefour',
      'assai',
      'atacadao',
      'pao de acucar',
      'hortifruti',
      'outback',
      'mcdonald',
      'burger king',
      'habib',
      'subway',
      'starbucks',
      'sodexo',
      'alelo',
      'ticket',
      'beevale',
    ],
  },
  {
    name: 'Transporte',
    keywords: [
      'uber',
      '99app',
      '99 pop',
      '99pay',
      'metro',
      'onibus',
      'shell',
      'ipiranga',
      'petrobras',
      'posto',
      'estacionamento',
      'sem parar',
      'veloe',
      'conectcar',
    ],
  },
  {
    name: 'Moradia',
    keywords: [
      'aluguel',
      'condominio',
      'enel',
      'light',
      'sabesp',
      'comgas',
      'internet',
      'vivo',
      'claro',
      'tim ',
      'algar',
    ],
  },
  {
    name: 'Saúde',
    keywords: [
      'drogaria',
      'farmacia',
      'drogaraia',
      'pague menos',
      'raia',
      'unimed',
      'amil',
      'hospital',
      'laboratorio',
    ],
  },
  {
    name: 'Lazer',
    keywords: [
      'netflix',
      'spotify',
      'disney',
      'prime video',
      'youtube',
      'cinema',
      'steam',
      'playstation',
      'xbox',
    ],
  },
  {
    name: 'Compras',
    keywords: [
      'amazon',
      'shopee',
      'mercado livre',
      'mercadolivre',
      'magazine',
      'americanas',
      'casas bahia',
      'shein',
    ],
  },
  {
    name: 'Transferência',
    keywords: ['pix', 'ted', 'doc', 'transferencia', 'transf '],
  },
  {
    name: 'Educação',
    keywords: ['escola', 'faculdade', 'curso', 'udemy', 'alura', 'mensalidade'],
  },
  {
    name: 'Assinaturas',
    keywords: ['assinatura', 'anuidade', 'icloud', 'google one', 'openai', 'chatgpt'],
  },
  {
    name: 'Viagens',
    keywords: ['gol', 'latam', 'azul', 'decolar', 'booking', 'airbnb', 'hotel'],
  },
  {
    name: 'Impostos e tarifas',
    keywords: ['iof', 'tarifa', 'anuidade', 'imposto', 'darf', 'ipva', 'iptu'],
  },
]

export const DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES.map((item) => ({ ...item, kind: 'expense' as const })),
  ...DEFAULT_INCOME_CATEGORIES.map((item) => ({ ...item, kind: 'income' as const })),
]

export function bankLabel(bank: ExpenseBank | null) {
  return BANKS.find((item) => item.id === bank)?.label ?? 'Sem banco'
}

export function methodLabel(method: PaymentMethod | null) {
  return PAYMENT_METHODS.find((item) => item.id === method)?.label ?? 'Sem tipo'
}

export function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((item) => item.id === type)?.label ?? 'Conta'
}

export function institutionLabel(institution: AccountInstitution) {
  return INSTITUTIONS.find((item) => item.id === institution)?.label ?? 'Instituição'
}

export function inferCategoryKind(name: string): 'income' | 'expense' {
  const hay = normalize(name)
  if (DEFAULT_INCOME_CATEGORIES.some((item) => normalize(item.name) === hay)) return 'income'
  if (['salario', 'renda extra', 'reembolso', 'rendimentos'].includes(hay)) return 'income'
  return 'expense'
}

export function suggestCategoryName(
  description: string,
  bank: ExpenseBank | null,
  kind: 'income' | 'expense' = 'expense',
) {
  const hay = normalize(description)
  const pool = kind === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES
  for (const category of pool) {
    if (category.keywords.some((keyword) => hay.includes(keyword))) {
      return category.name
    }
  }
  if (kind === 'expense' && bank === 'beevale') return 'Alimentação'
  return null
}
