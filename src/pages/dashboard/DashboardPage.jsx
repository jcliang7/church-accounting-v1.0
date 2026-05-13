import { useAuth } from '../../context/AuthContext'

export default function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        歡迎回來，{profile?.full_name ?? '同工'}！
      </h2>
      <p className="text-gray-500 text-sm">中原生命樹財務管理系統 v1.0</p>
    </div>
  )
}
