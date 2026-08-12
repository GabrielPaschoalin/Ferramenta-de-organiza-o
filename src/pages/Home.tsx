import { Link } from 'react-router-dom'
import { NavGlyph } from '@/components/icons'
import { useAuth } from '@/context/AuthContext'
import { modules, type ModuleId } from '@/lib/nav'

const iconByModule: Record<ModuleId, 'check' | 'wallet' | 'map'> = {
  tarefas: 'check',
  financas: 'wallet',
  viagens: 'map',
}

export function Home() {
  const { user } = useAuth()
  const name = user?.displayName?.split(' ')[0] ?? 'você'

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-forest">
        Início
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink md:text-4xl">
        Bem-vindo, {name}
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Esta é a casca do app. Os módulos abaixo entram um de cada vez, sem
        reescrever o restante.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <li key={mod.id}>
            <Link
              to={mod.to}
              className="block h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-forest/30"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-forest">
                  <NavGlyph name={iconByModule[mod.id]} className="h-5 w-5" />
                </span>
                {mod.status === 'em breve' ? (
                  <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                    em breve
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-secondary">
                    ativo
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-serif text-xl text-ink">{mod.title}</h2>
              <p className="mt-1 text-sm text-muted">{mod.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
