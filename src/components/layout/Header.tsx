import { LogoutIcon } from '@/components/icons'
import { useAuth } from '@/context/AuthContext'

export function Header() {
  const { user, signOut } = useAuth()
  const name = user?.displayName?.split(' ')[0] ?? 'você'
  const photo = user?.photoURL

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur md:px-8">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted md:hidden">Central</p>
        <p className="truncate font-serif text-lg text-ink md:text-xl">Olá, {name}</p>
      </div>
      <div className="flex items-center gap-2">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-8 w-8 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs text-paper">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-line hover:text-ink"
        >
          <LogoutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
