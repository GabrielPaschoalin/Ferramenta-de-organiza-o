import { useState } from 'react'
import { ExpensesPage } from '@/modules/finance/ExpensesPage'
import { InvestmentsPage } from '@/modules/finance/investments/InvestmentsPage'

type Tab = 'gastos' | 'investimentos'

function tabClass(active: boolean) {
  return [
    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
    active ? 'bg-forest text-paper' : 'bg-surface text-muted hover:text-ink',
  ].join(' ')
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('gastos')

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-forest">
        Finanças
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink md:text-4xl">Seu dinheiro no mês</h1>
      <p className="mt-2 text-muted">
        Gastos do extrato e investimentos (ações, caixinha e Tesouro).
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('gastos')} className={tabClass(tab === 'gastos')}>
          Gastos
        </button>
        <button
          type="button"
          onClick={() => setTab('investimentos')}
          className={tabClass(tab === 'investimentos')}
        >
          Investimentos
        </button>
      </div>

      <div className="mt-6">{tab === 'gastos' ? <ExpensesPage /> : <InvestmentsPage />}</div>
    </div>
  )
}
