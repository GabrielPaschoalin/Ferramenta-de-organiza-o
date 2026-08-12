import { NavGlyph } from '@/components/icons'
import { modules, type ModuleId } from '@/lib/nav'

const iconByModule: Record<ModuleId, 'check' | 'wallet' | 'map'> = {
  tarefas: 'check',
  financas: 'wallet',
  viagens: 'map',
}

export function Placeholder({ moduleId }: { moduleId: ModuleId }) {
  const mod = modules.find((item) => item.id === moduleId)

  if (!mod) return null

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-line bg-surface p-8 md:p-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-forest">
          <NavGlyph name={iconByModule[mod.id]} className="h-6 w-6" />
        </span>
        <h1 className="mt-6 font-serif text-3xl text-ink">{mod.title}</h1>
        <p className="mt-3 text-muted">{mod.blurb}</p>
        <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-sm text-ink">
          Este módulo entra na próxima etapa. A casca (login, menu e navegação)
          já está pronta para recebê-lo.
        </p>
      </div>
    </div>
  )
}
