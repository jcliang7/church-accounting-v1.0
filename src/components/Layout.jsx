import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',        label: '總覽',   end: true  },
  { to: '/expense', label: '支出請款', end: false },
]

export default function Layout() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-800 text-sm">中原生命樹浸信會</h1>
          <p className="text-xs text-gray-400 mt-0.5">財務管理系統</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`
              }>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 px-3 mb-2">
            {profile?.full_name ?? user?.email}
          </p>
          <button onClick={signOut}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition">
            登出
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
