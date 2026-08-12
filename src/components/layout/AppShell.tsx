import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
