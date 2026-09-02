import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  Investment,
  InvestmentType,
  StockLot,
} from '@/modules/finance/investments/types'

function requireDb() {
  if (!db) {
    throw new Error('Firebase ainda não está configurado.')
  }
  return db
}

function investmentsCol(uid: string) {
  return collection(requireDb(), 'users', uid, 'investments')
}

function asLot(data: Record<string, unknown>): StockLot | null {
  const id = String(data.id ?? '')
  const date = String(data.date ?? '')
  const quantity = Number(data.quantity)
  const price = Number(data.price)
  if (!id || !date || !Number.isFinite(quantity) || !Number.isFinite(price)) return null
  return { id, date, quantity, price }
}

function isType(value: unknown): value is InvestmentType {
  return value === 'stock' || value === 'caixa' || value === 'tesouro'
}

function asInvestment(id: string, data: Record<string, unknown>): Investment {
  const lotsRaw = Array.isArray(data.lots) ? data.lots : []
  const lots = lotsRaw
    .map((item) => (item && typeof item === 'object' ? asLot(item as Record<string, unknown>) : null))
    .filter((item): item is StockLot => Boolean(item))

  return {
    id,
    type: isType(data.type) ? data.type : 'caixa',
    name: String(data.name ?? ''),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    ticker: typeof data.ticker === 'string' ? data.ticker : null,
    lots,
    investedAmount: typeof data.investedAmount === 'number' ? data.investedAmount : null,
    currentAmount: typeof data.currentAmount === 'number' ? data.currentAmount : null,
    purchasedAt: typeof data.purchasedAt === 'string' ? data.purchasedAt : null,
    maturityAt: typeof data.maturityAt === 'string' ? data.maturityAt : null,
  }
}

export function subscribeInvestments(
  uid: string,
  onData: (items: Investment[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(investmentsCol(uid)),
    (snap) => {
      const items = snap.docs
        .map((item) => asInvestment(item.id, item.data()))
        .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
      onData(items)
    },
    (error) => onError(error.message),
  )
}

export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>

export async function addInvestment(uid: string, input: InvestmentInput) {
  const now = Date.now()
  const ref = await addDoc(investmentsCol(uid), {
    ...input,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateInvestment(
  uid: string,
  id: string,
  patch: Partial<InvestmentInput>,
) {
  await updateDoc(doc(requireDb(), 'users', uid, 'investments', id), {
    ...patch,
    updatedAt: Date.now(),
  })
}

export async function deleteInvestment(uid: string, id: string) {
  await deleteDoc(doc(requireDb(), 'users', uid, 'investments', id))
}
