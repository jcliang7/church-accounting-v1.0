import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const ANONYMOUS_DONOR_ID = '217083cb-b291-4860-8a44-6958d0fe0d62'

const RECEIPT_PREF_MAP = {
  0: { text: '待確認',  cls: 'bg-yellow-100 text-yellow-700' },
  1: { text: '單次收據', cls: 'bg-blue-100 text-blue-600' },
  2: { text: '年度收據', cls: 'bg-green-100 text-green-700' },
  3: { text: '不需要',  cls: 'bg-gray-100 text-gray-500' },
}

export default function OfferingListPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [offerings, setOfferings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const isAdmin   = profile?.role === 'admin'
  const canAccess = profile?.role === 'admin' || profile?.role === 'manager'

  useEffect(() => {
    if (!profile) return
    if (!canAccess) { setLoading(false); return }
    fetchOfferings()
  }, [profile])

  async function fetchOfferings() {
    try {
      setLoading(true)
      setError(null)

      const [offeringsRes, typesRes, donorsRes, methodsRes, banksRes] = await Promise.all([
        supabase.from('offerings').select('*')
          .order('accounting_week', { ascending: false })
          .order('created_at',      { ascending: false }),
        supabase.from('offering_types').select('id, name'),
        supabase.from('donors').select('id, main_id, sub_id, name'),
        supabase.from('payment_methods').select('id, method_name'),
        supabase.from('bank_accounts').select('id, name'),
      ])

      if (offeringsRes.error) throw offeringsRes.error

      const typeMap   = Object.fromEntries((typesRes.data   || []).map(t => [t.id, t.name]))
      const donorMap  = Object.fromEntries((donorsRes.data  || []).map(d => [d.id, d]))
      const methodMap = Object.fromEntries((methodsRes.data || []).map(m => [m.id, m.method_name]))
      const bankMap   = Object.fromEntries((banksRes.data   || []).map(b => [b.id, b.name]))

      setOfferings((offeringsRes.data || []).map(o => {
        const donor = donorMap[o.donor_id]
        const isAnon = o.donor_id === ANONYMOUS_DONOR_ID
        // 匿名或 main_id 為空都顯示「—」
        const donorCode = (!isAnon && donor?.main_id != null)
          ? (donor.sub_id && donor.sub_id > 0
              ? `${donor.main_id}-${donor.sub_id}`
              : String(donor.main_id))
          : ''
        const isTransfer = !!(o.bank_account_id)
        return {
          ...o,
          type_name:        typeMap[o.offering_type_id]    || '—',
          donor_display:    donor?.name                    || '—',  // 一律抓 donors.name
          donor_id_display: donorCode,
          method_name:      methodMap[o.payment_method_id] || '—',
          bank_name:        isTransfer ? (bankMap[o.bank_account_id] || '—') : '—',
          transfer_display: isTransfer ? (o.transfer_info || '—') : '—',
        }
      }))
    } catch (err) {
      setError('載入失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (profile && !canAccess) {
    return <div className="text-center py-16 text-gray-400 text-sm">您沒有權限查看此頁面</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">奉獻記帳</h2>
          <p className="text-sm text-gray-500 mt-0.5">奉獻收入紀錄</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/offerings/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            ＋ 新增奉獻
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">載入中...</div>
      ) : offerings.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">尚無奉獻紀錄</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">奉獻日期</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">週別日期</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-16">編號</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">奉獻者</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">奉獻項目</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">金額</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">存款方式</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">轉入銀行</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">末五碼</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">收據開立方式</th>
                {isAdmin && <th className="px-4 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offerings.map(o => {
                const receipt = RECEIPT_PREF_MAP[o.receipt_pref] ?? RECEIPT_PREF_MAP[0]
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700">
                      {o.offering_date
                        ? new Date(o.offering_date + 'T00:00:00').toLocaleDateString('zh-TW')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {o.accounting_week
                        ? new Date(o.accounting_week + 'T00:00:00').toLocaleDateString('zh-TW')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {o.donor_id_display || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.donor_display}</td>
                    <td className="px-4 py-3 text-gray-700">{o.type_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      NT$ {Number(o.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{o.method_name}</td>
                    <td className="px-4 py-3 text-gray-500">{o.bank_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{o.transfer_display}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${receipt.cls}`}>
                        {receipt.text}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/offerings/${o.id}/edit`)}
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
