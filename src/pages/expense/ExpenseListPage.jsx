import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  0: { text: '草稿',  cls: 'bg-gray-100 text-gray-600' },
  1: { text: '已入帳', cls: 'bg-green-100 text-green-700' },
}

export default function ExpenseListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (profile) fetchRequests()
  }, [profile])

  async function fetchRequests() {
    try {
      setLoading(true)
      setError(null)

      // 1. 先撈所有 members（用於顯示申請人名稱）
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, full_name')

      if (membersError) throw membersError

      const memberMap = {}
      ;(membersData || []).forEach(m => { memberMap[m.id] = m.full_name })

      // 2. 組查詢
      let query = supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false })

      // user 角色只看自己的
      if (profile?.role === 'user') {
        const myMember = (membersData || []).find(
          m => m.full_name === profile.full_name
        )
        if (myMember) {
          query = query.eq('applicant_id', myMember.id)
        } else {
          // 找不到對應 member，回傳空列表
          setRequests([])
          setLoading(false)
          return
        }
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      // 3. 組合申請人名稱
      const enriched = (data || []).map(req => ({
        ...req,
        applicant_name: memberMap[req.applicant_id] ?? '—',
      }))

      setRequests(enriched)
    } catch (err) {
      setError('載入失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* 頁首 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">支出請款</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理支出請款單</p>
        </div>
        <button
          onClick={() => navigate('/expense/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          ＋ 新增請款單
        </button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* 載入中 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">載入中...</div>
      ) : requests.length === 0 ? (
        /* 空狀態 */
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">尚無請款單</p>
          <button
            onClick={() => navigate('/expense/new')}
            className="mt-3 text-blue-600 hover:underline text-sm"
          >
            建立第一張請款單
          </button>
        </div>
      ) : (
        /* 列表 */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">狀態</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">臨時編號</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">正式編號</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">申請人</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">總金額</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">建立日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(req => {
                const status = STATUS_MAP[req.status] ?? STATUS_MAP[0]
                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {req.temp_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {req.formal_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {req.applicant_name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      NT$ {Number(req.total_amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(req.created_at).toLocaleDateString('zh-TW')}
                    </td>
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
