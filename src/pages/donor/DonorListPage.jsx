import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function formatDonorId(main_id, sub_id) {
  if (!main_id && main_id !== 0) return '—'
  if (sub_id === null || sub_id === undefined || sub_id === 0) return String(main_id)
  return `${main_id}-${sub_id}`
}

const FILTER_OPTIONS = [
  { key: 'all',       label: '全部' },
  { key: 'active',    label: '在籍' },
  { key: 'inactive',  label: '已離開' },
]

export default function DonorListPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [donors,  setDonors]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('active')   // 預設顯示在籍

  const isAdmin   = profile?.role === 'admin'
  const canAccess = profile?.role === 'admin' || profile?.role === 'manager'

  useEffect(() => {
    if (!profile) return
    if (!canAccess) { setLoading(false); return }
    fetchDonors()
  }, [profile])

  async function fetchDonors() {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('donors')
        .select('*')
        .order('main_id', { ascending: true, nullsFirst: false })
        .order('sub_id',  { ascending: true, nullsFirst: true })

      if (err) throw err
      setDonors(data || [])
    } catch (err) {
      setError('載入失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 篩選 + 搜尋（前端處理）
  const filtered = donors.filter(d => {
    if (filter === 'active'   && !d.is_active) return false
    if (filter === 'inactive' &&  d.is_active) return false
    if (search && !d.name?.includes(search))   return false
    return true
  })

  if (profile && !canAccess) {
    return <div className="text-center py-16 text-gray-400 text-sm">您沒有權限查看此頁面</div>
  }

  return (
    <div>
      {/* 頁首 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">奉獻者資料</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理奉獻者基本資料</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/donors/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            ＋ 新增奉獻者
          </button>
        )}
      </div>

      {/* 篩選列 + 搜尋 */}
      <div className="flex items-center gap-4 mb-4">
        {/* 切換按鈕 */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-4 py-1.5 transition ${
                filter === opt.key
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 搜尋 */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋姓名…"
          className="w-52 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">{filtered.length} 筆</span>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {search ? '找不到符合的奉獻者' : '此分類尚無資料'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">編號</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">姓名</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">電話</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">地址</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">備註</th>
                {isAdmin && <th className="px-4 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(donor => {
                // is_active = false → 整列文字淺灰
                const rowCls = donor.is_active === false
                  ? 'text-gray-300'
                  : 'text-gray-700'
                return (
                  <tr key={donor.id} className="hover:bg-gray-50 transition">
                    <td className={`px-4 py-3 font-mono text-xs ${rowCls}`}>
                      {formatDonorId(donor.main_id, donor.sub_id)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${donor.is_active === false ? 'text-gray-300' : 'text-gray-800'}`}>
                      {donor.name}
                    </td>
                    <td className={`px-4 py-3 ${rowCls}`}>{donor.phone   || '—'}</td>
                    <td className={`px-4 py-3 ${rowCls}`}>{donor.email   || '—'}</td>
                    <td className={`px-4 py-3 max-w-[180px] truncate ${rowCls}`}>
                      {donor.address || '—'}
                    </td>
                    <td className={`px-4 py-3 max-w-[160px] truncate ${rowCls}`}>
                      {donor.note || '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/donors/${donor.id}/edit`)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          編輯
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
