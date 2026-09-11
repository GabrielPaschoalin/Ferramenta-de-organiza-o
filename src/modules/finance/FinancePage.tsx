import { useState } from 'react'
import { ExpensesPage } from '@/modules/finance/ExpensesPage'
import { InvestmentsPage } from '@/modules/finance/investments/InvestmentsPage'
import { SummaryPage } from '@/modules/finance/SummaryPage'

type Tab = 'caixa' | 'cartao' | 'investimentos' | 'resumo'

function tabClass(active: boolean) {
  return [
    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
    active ? 'bg-forest text-paper' : 'bg-surface text-muted hover:text-ink',
  ].join(' ')
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('caixa')

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-forest">
        Finanças
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink md:text-4xl">Seu dinheiro no mês</h1>
      <p className="mt-2 text-muted">
        Fluxo das contas, cartão, investimentos e resumo.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('caixa')} className={tabClass(tab === 'caixa')}>
          Fluxo de caixa
        </button>
        <button type="button" onClick={() => setTab('cartao')} className={tabClass(tab === 'cartao')}>
          Cartão de crédito
        </button>
        <button
          type="button"
          onClick={() => setTab('investimentos')}
          className={tabClass(tab === 'investimentos')}
        >
          Investimentos
        </button>
        <button type="button" onClick={() => setTab('resumo')} className={tabClass(tab === 'resumo')}>
          Resumo
        </button>
      </div>

      <div className="mt-6">
        {tab === 'caixa' ? <ExpensesPage mode="cashflow" /> : null}
        {tab === 'cartao' ? <ExpensesPage mode="credit" /> : null}
        {tab === 'investimentos' ? <InvestmentsPage /> : null}
        {tab === 'resumo' ? <SummaryPage /> : null}
      </div>
    </div>
  )
}
