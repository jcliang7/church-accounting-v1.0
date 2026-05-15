import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import Layout from './components/Layout'
import ExpenseListPage from './pages/expense/ExpenseListPage'
import ExpenseFormPage from './pages/expense/ExpenseFormPage'
import DonorListPage from './pages/donor/DonorListPage'
import DonorFormPage from './pages/donor/DonorFormPage'
import OfferingListPage from './pages/offering/OfferingListPage'
import OfferingFormPage from './pages/offering/OfferingFormPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">載入中...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">載入中...</div>

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="expense" element={<ExpenseListPage />} />
        <Route path="expense/new" element={<ExpenseFormPage />} />
        <Route path="donors" element={<DonorListPage />} />
        <Route path="donors/new" element={<DonorFormPage />} />
        <Route path="donors/:id/edit" element={<DonorFormPage />} />
        <Route path="offerings" element={<OfferingListPage />} />
        <Route path="offerings/new" element={<OfferingFormPage />} />
        <Route path="offerings/:id/edit" element={<OfferingFormPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
