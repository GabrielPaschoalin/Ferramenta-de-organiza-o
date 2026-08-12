import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GoogleIcon } from '@/components/icons'
import { useAuth } from '@/context/AuthContext'

export function Login() {
  const { user, loading, configured, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleGoogle() {
    setError(null)
    setPending(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Não foi possível entrar com o Google. Tente de novo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-[0_20px_60px_-40px_rgba(26,22,20,0.45)]">
        <p className="font-serif text-4xl text-forest">Central</p>
        <p className="mt-2 text-sm text-muted">
          Sua base de organização: tarefas, finanças e viagens, no celular e no
          notebook.
        </p>

        {!configured ? (
          <div className="mt-8 rounded-2xl border border-line bg-paper p-4 text-sm leading-relaxed text-ink">
            <p className="font-medium">Firebase ainda não está configurado.</p>
            <p className="mt-2 text-muted">
              Copie o arquivo <code className="text-ink">.env.example</code> para{' '}
              <code className="text-ink">.env</code>, cole as chaves do projeto no
              console do Firebase e reinicie o servidor com{' '}
              <code className="text-ink">npm run dev</code>.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={pending}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-line disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {pending ? 'Entrando...' : 'Entrar com Google'}
          </button>
        )}

        {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      </div>
    </div>
  )
}
