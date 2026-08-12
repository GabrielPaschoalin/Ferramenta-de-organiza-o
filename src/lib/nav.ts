export type NavIcon = 'home' | 'check' | 'wallet' | 'map'

export type NavItem = {
  to: string
  label: string
  icon: NavIcon
}

export type ModuleId = 'tarefas' | 'financas' | 'viagens'

export type ModuleInfo = {
  id: ModuleId
  to: string
  title: string
  blurb: string
  status: 'em breve' | 'ativo'
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/tarefas', label: 'Tarefas', icon: 'check' },
  { to: '/financas', label: 'Finanças', icon: 'wallet' },
  { to: '/viagens', label: 'Viagens', icon: 'map' },
]

export const modules: ModuleInfo[] = [
  {
    id: 'tarefas',
    to: '/tarefas',
    title: 'Tarefas',
    blurb: 'Listas, prazos e o que precisa ser feito no dia a dia.',
    status: 'ativo',
  },
  {
    id: 'financas',
    to: '/financas',
    title: 'Finanças',
    blurb: 'Contas, categorias, saldo e lançamentos em um só lugar.',
    status: 'em breve',
  },
  {
    id: 'viagens',
    to: '/viagens',
    title: 'Viagens',
    blurb: 'Roteiro, checklist e gastos de cada viagem.',
    status: 'em breve',
  },
]
