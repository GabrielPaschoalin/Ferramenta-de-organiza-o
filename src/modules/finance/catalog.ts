import type { ExpenseBank, PaymentMethod } from '@/modules/finance/types'

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
]

export const DEFAULT_CATEGORIES: { name: string; keywords: string[] }[] = [
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
]

export function bankLabel(bank: ExpenseBank | null) {
  return BANKS.find((item) => item.id === bank)?.label ?? 'Sem banco'
}

export function methodLabel(method: PaymentMethod | null) {
  return PAYMENT_METHODS.find((item) => item.id === method)?.label ?? 'Sem tipo'
}

export function suggestCategoryName(description: string, bank: ExpenseBank | null) {
  const hay = normalize(description)
  for (const category of DEFAULT_CATEGORIES) {
    if (category.keywords.some((keyword) => hay.includes(keyword))) {
      return category.name
    }
  }
  if (bank === 'beevale') return 'Alimentação'
  return null
}
