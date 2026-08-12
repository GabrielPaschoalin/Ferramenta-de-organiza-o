import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/context/AuthContext'
import { TodosPage } from '@/modules/todos/TodosPage'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/tarefas" element={<TodosPage />} />
              <Route path="/financas" element={<Placeholder moduleId="financas" />} />
              <Route path="/viagens" element={<Placeholder moduleId="viagens" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
