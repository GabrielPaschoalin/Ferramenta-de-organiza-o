import { useState } from 'react'
import { ExpensesPage } from '@/modules/finance/ExpensesPage'

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
        Gastos a partir do extrato. Investimentos entram na próxima etapa.
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

      <div className="mt-6">
        {tab === 'gastos' ? (
          <ExpensesPage />
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center">
            <p className="font-medium text-ink">Investimentos</p>
            <p className="mt-2 text-sm text-muted">
              Esta parte entra na próxima etapa. Por enquanto, use a aba Gastos para
              importar o extrato e acompanhar o mês.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
