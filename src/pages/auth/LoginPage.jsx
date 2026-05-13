import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">中原生命樹</h1>
          <p className="text-gray-400 text-sm mt-1">財務管理系統 v1.0</p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          使用 Google 帳號登入
        </button>
        <p className="text-xs text-gray-400 mt-6">僅限授權同工登入</p>
      </div>
    </div>
  )
}
