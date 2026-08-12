import { NavLink } from 'react-router-dom'
import { NavGlyph } from '@/components/icons'
import { navItems } from '@/lib/nav'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium',
    isActive ? 'text-forest' : 'text-muted',
  ].join(' ')

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
            <NavGlyph name={item.icon} className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
