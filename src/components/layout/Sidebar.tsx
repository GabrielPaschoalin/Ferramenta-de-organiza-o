import { NavLink } from 'react-router-dom'
import { NavGlyph } from '@/components/icons'
import { navItems } from '@/lib/nav'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-forest text-paper'
      : 'text-ink/80 hover:bg-line/70 hover:text-ink',
  ].join(' ')

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
      <div className="px-3">
        <p className="font-serif text-2xl text-forest">Central</p>
        <p className="mt-1 text-xs text-muted">organização pessoal</p>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <NavGlyph name={item.icon} className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
