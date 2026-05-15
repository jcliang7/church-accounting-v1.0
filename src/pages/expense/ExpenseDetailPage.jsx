import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  0: { text: '草稿',   cls: 'bg-gray-100 text-gray-600'   },
  1: { text: '已入帳', cls: 'bg-green-100 text-green-700' },
}

// ── 工具：將 YYYY-MM-DD 轉為「中{ROC年}{MM}{DD}」前綴 ──────────
function toFormalPrefix(dateStr) {
  if (!dateStr) return ''
  const d       = new Date(dateStr + 'T00:00:00')
  const rocYear = d.getFullYear() - 1911
  const mm      = String(d.getMonth() + 1).padStart(2, '0')
  const dd      = String(d.getDate()).padStart(2, '0')
  return `中${rocYear}${mm}${dd}`
}

export default function ExpenseDetailPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { id }      = useParams()

  const isAdmin = profile?.role === 'admin'

  const [request,  setRequest]  = useState(null)
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // ── 核發正式編號 modal ──
  const [showIssueFormal,    setShowIssueFormal]    = useState(false)
  const [accountingWeekInput, setAccountingWeekInput] = useState('')
  const [issuing,             setIssuing]             = useState(false)
  const [issueError,          setIssueError]          = useState(null)

  // ── 解除鎖定 modal ──
  const [showUnlock,  setShowUnlock]  = useState(false)
  const [unlocking,   setUnlocking]   = useState(false)
  const [unlockError, setUnlockError] = useState(null)

  useEffect(() => {
    if (profile && id) loadData()
  }, [profile, id])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [reqRes, itemsRes, membersRes, methodsRes, accountRes] = await Promise.all([
        supabase.from('payment_requests').select('*').eq('id', id).single(),
        supabase.from('expense_items').select('*').eq('request_id', id).order('id'),
        supabase.from('members').select('id, full_name'),
        supabase.from('payment_methods').select('id, method_name'),
        supabase.from('accounting_item_mapping').select('id, account_name'),
      ])

      if (reqRes.error) throw reqRes.error

      const memberMap  = Object.fromEntries((membersRes.data  || []).map(m => [m.id, m.full_name]))
      const methodMap  = Object.fromEntries((methodsRes.data  || []).map(m => [m.id, m.method_name]))
      const accountMap = Object.fromEntries((accountRes.data  || []).map(a => [a.id, a.account_name]))

      const req = reqRes.data
      setRequest({
        ...req,
        applicant_name:  memberMap[req.applicant_id]       || '—',
        supervisor_name: memberMap[req.supervisor_id]      || '—',
        method_name:     methodMap[req.payment_method_id]  || '—',
      })

      setItems((itemsRes.data || []).map((item, idx) => ({
        ...item,
        seq:               idx + 1,
        account_name_disp: accountMap[item.detail_id] || '—',
        payer_name:        memberMap[item.payer_id]   || '—',
      })))
    } catch (err) {
      setError('載入失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── 核發正式編號 ──────────────────────────────────────────────
  async function handleIssueFormal() {
    if (!accountingWeekInput) return
    setIssuing(true)
    setIssueError(null)
    try {
      // 計算正式編號前綴（中+民國年+月日）
      const prefix = toFormalPrefix(accountingWeekInput)

      // 查目前同前綴已有幾筆，決定序號
      const { data: existing } = await supabase
        .from('payment_requests')
        .select('formal_id')
        .like('formal_id', `${prefix}%`)
        .order('formal_id', { ascending: false })
        .limit(1)

      const lastSeq = existing?.length > 0
        ? (parseInt(existing[0].formal_id.replace(prefix, ''), 10) || 0)
        : 0
      const formalId = `${prefix}${String(lastSeq + 1).padStart(2, '0')}`

      const { error: err } = await supabase
        .from('payment_requests')
        .update({ formal_id: formalId, accounting_week: accountingWeekInput, status: 1 })
        .eq('id', id)
      if (err) throw err

      setRequest(prev => ({
        ...prev,
        formal_id:       formalId,
        accounting_week: accountingWeekInput,
        status:          1,
      }))
      setShowIssueFormal(false)
      setAccountingWeekInput('')
    } catch (err) {
      setIssueError('更新失敗：' + err.message)
    } finally {
      setIssuing(false)
    }
  }

  // ── 解除鎖定 ──────────────────────────────────────────────────
  async function handleUnlock() {
    setUnlocking(true)
    setUnlockError(null)
    try {
      const { error: err } = await supabase
        .from('payment_requests')
        .update({ status: 0, formal_id: null, accounting_week: null })
        .eq('id', id)
      if (err) throw err

      setRequest(prev => ({
        ...prev,
        status:          0,
        formal_id:       null,
        accounting_week: null,
      }))
      setShowUnlock(false)
    } catch (err) {
      setUnlockError('更新失敗：' + err.message)
    } finally {
      setUnlocking(false)
    }
  }

  // ── 載入 / 錯誤畫面 ────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中...</div>
  }
  if (error || !request) {
    return <div className="text-center py-16 text-red-400 text-sm">{error || '找不到此請款單'}</div>
  }

  const status  = STATUS_MAP[request.status] ?? STATUS_MAP[0]
  const isDraft = request.status === 0
  const total   = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  // 正式編號預覽（含日期前綴，序號用 XX 佔位）
  const formalPreview = accountingWeekInput
    ? `${toFormalPrefix(accountingWeekInput)}XX`
    : ''

  return (
    <div className="max-w-4xl">

      {/* ── 頂部操作列 ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/expense')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
          >
            ← 返回列表
          </button>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
            {status.text}
          </span>
        </div>

        <div className="flex gap-2">
          {/* 草稿：全員可編輯 */}
          {isDraft && (
            <button
              onClick={() => navigate(`/expense/${id}/edit`)}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
            >
              編輯
            </button>
          )}

          {/* 全員可列印 */}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
          >
            列印
          </button>

          {/* Admin + 草稿：核發正式編號 */}
          {isDraft && isAdmin && (
            <button
              onClick={() => setShowIssueFormal(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              核發正式編號
            </button>
          )}

          {/* Admin + 已入帳：解除鎖定 */}
          {!isDraft && isAdmin && (
            <button
              onClick={() => setShowUnlock(true)}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            >
              解除鎖定
            </button>
          )}
        </div>
      </div>

      {/* 列印標題 */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">中原生命樹浸信會 支出請款單</h1>
      </div>

      {/* ── 基本資訊 ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">基本資訊</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">臨時編號</span>
            <span className="font-mono text-gray-700">{request.temp_id || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">正式編號</span>
            <span className="font-mono text-gray-700">{request.formal_id || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">申請日期</span>
            <span className="text-gray-700">
              {request.created_at
                ? new Date(request.created_at).toLocaleDateString('zh-TW')
                : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">週別日期</span>
            <span className="text-gray-700">
              {request.accounting_week
                ? new Date(request.accounting_week + 'T00:00:00').toLocaleDateString('zh-TW')
                : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">申請人</span>
            <span className="text-gray-700">{request.applicant_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">主管</span>
            <span className="text-gray-700">{request.supervisor_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">預算部門</span>
            <span className="text-gray-700">中原生命樹</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">支出方式</span>
            <span className="text-gray-700">{request.method_name}</span>
          </div>
        </div>
      </div>

      {/* ── 支出明細 ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">支出明細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-center px-3 py-3 text-gray-500 font-medium w-10">#</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium whitespace-nowrap">發票日期</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium whitespace-nowrap">發票號碼</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium whitespace-nowrap">會計科目</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium">品項</th>
                <th className="text-right px-3 py-3 text-gray-500 font-medium whitespace-nowrap">金額</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium whitespace-nowrap">代墊人</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-center text-gray-400 text-xs">{item.seq}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {item.invoice_date
                      ? new Date(item.invoice_date + 'T00:00:00').toLocaleDateString('zh-TW')
                      : '—'}
                  </td>
                  <td className="px-3 py-3 font-mono text-gray-500 whitespace-nowrap">{item.invoice_no || '—'}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{item.account_name_disp}</td>
                  <td className="px-3 py-3 text-gray-700">{item.item_name || '—'}</td>
                  <td className="px-3 py-3 text-right text-gray-700 tabular-nums whitespace-nowrap">
                    NT$ {Number(item.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{item.payer_name}</td>
                  <td className="px-3 py-3 text-gray-400">{item.note || ''}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium border-t border-gray-200">
                <td colSpan={5} className="px-3 py-3 text-right text-gray-600 text-sm">合計</td>
                <td className="px-3 py-3 text-right text-gray-800 tabular-nums whitespace-nowrap">
                  NT$ {total.toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 簽核欄 ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-6">簽核</h3>
        <div className="grid grid-cols-3 gap-6">
          {['主任牧師', '部門主管', '申請人'].map(role => (
            <div key={role} className="border border-gray-200 rounded-lg p-4 min-h-24 flex flex-col justify-between">
              <span className="text-xs text-gray-400">{role}</span>
              <div className="border-b border-gray-200 mt-10"></div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Modal：核發正式編號
      ══════════════════════════════════════════════════════════ */}
      {showIssueFormal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-1">核發正式編號</h3>
            <p className="text-xs text-gray-400 mb-5">
              填入週別日期後，系統將自動產生正式編號並更新狀態為「已入帳」
            </p>

            {/* 週別日期輸入 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                週別日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={accountingWeekInput}
                onChange={e => setAccountingWeekInput(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 正式編號預覽 */}
            {formalPreview && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-blue-400 mb-0.5">正式編號預覽</p>
                <p className="font-mono text-sm text-blue-700 font-semibold">
                  {formalPreview}
                  <span className="text-blue-400 font-normal ml-1">（序號自動分配）</span>
                </p>
              </div>
            )}

            {issueError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-xs">
                {issueError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowIssueFormal(false)
                  setAccountingWeekInput('')
                  setIssueError(null)
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleIssueFormal}
                disabled={!accountingWeekInput || issuing}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {issuing ? '處理中…' : '確認核發'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          Modal：解除鎖定確認
      ══════════════════════════════════════════════════════════ */}
      {showUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-88 mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-1">解除鎖定</h3>
            <p className="text-sm text-gray-500 mb-2">
              確定要解除此請款單的鎖定嗎？
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
              解除後：狀態將改回「草稿」，正式編號與週別日期將被清空。
            </p>

            {unlockError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-xs">
                {unlockError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowUnlock(false); setUnlockError(null) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                className="px-4 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {unlocking ? '處理中…' : '確認解除'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
