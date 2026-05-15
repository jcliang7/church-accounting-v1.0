import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ── 工具函式 ────────────────────────────────────────────────
function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function newEmptyItem() {
  return {
    invoice_date:  '',
    invoice_no:    '',
    budget_type:   '1',  // 1=一般費用, 2=人事費用
    fund_id:       '',
    subject_id:    '',
    category_name: '',   // 自動帶入，不存 DB
    detail_id:     '',
    account_code:  '',   // 自動帶入，不存 DB
    account_name:  '',   // 自動帶入，不存 DB
    activity_name: '',
    item_name:     '',
    amount:        '',
    payer_id:      '',
    note:       '',
  }
}

// ── 主元件 ───────────────────────────────────────────────────
export default function ExpenseFormPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // 查詢資料（下拉選單用）
  const [members,     setMembers]     = useState([])
  const [funds,       setFunds]       = useState([])
  const [subjects,    setSubjects]    = useState([])
  const [detailItems, setDetailItems] = useState([])
  const [cashMethodId, setCashMethodId] = useState(null)

  // 表頭
  const [tempId,       setTempId]      = useState('')
  const [applicantId,  setApplicantId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const applicationDate = todayStr()   // 顯示用，created_at 由 DB 自動產生

  // 明細（動態多筆）
  const [items, setItems] = useState([newEmptyItem()])

  // UI 狀態
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)
  const [isUserRole, setIsUserRole] = useState(false)

  // 主管候選人：只顯示 admin / manager
  const supervisors = members.filter(m => m.role === 'admin' || m.role === 'manager')

  // 自動計算總金額
  const totalAmount = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  )

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  // ── 載入查詢資料 ──────────────────────────────────────────
  async function loadData() {
    try {
      const [membersRes, fundsRes, subjectsRes, detailsRes, methodsRes] =
        await Promise.all([
          supabase.from('members').select('*').eq('is_active', true).order('full_name'),
          supabase.from('ministry_funds').select('*').order('name'),
          supabase.from('subject_category_mapping').select('*').order('subject_name'),
          supabase.from('accounting_item_mapping').select('*').order('item_detail_name'),
          supabase.from('payment_methods').select('*'),
        ])

      // ── Debug：可在瀏覽器 console 確認資料 ──
      // console.log('[members]',  membersRes.data, membersRes.error)
      // console.log('[funds]',    fundsRes.data,   fundsRes.error)
      // console.log('[subjects]', subjectsRes.data, subjectsRes.error)
      // console.log('[details]',  detailsRes.data,  detailsRes.error)
      // console.log('[methods]',  methodsRes.data,  methodsRes.error)

      // 收集錯誤訊息（不 throw，讓其他資料繼續設定）
      const errMsgs = [
        membersRes.error  && `同工名單（${membersRes.error.message}）`,
        fundsRes.error    && `事工專款（${fundsRes.error.message}）`,
        subjectsRes.error && `會計科目（${subjectsRes.error.message}）`,
        detailsRes.error  && `會計科目名稱（${detailsRes.error.message}）`,
      ].filter(Boolean)
      if (errMsgs.length > 0) setError('部分資料載入失敗：' + errMsgs.join('、'))

      const membersList = membersRes.data || []
      setMembers(membersList)
      setFunds(fundsRes.data || [])
      setSubjects(subjectsRes.data || [])
      setDetailItems(detailsRes.data || [])

      // 取「現金」付款方式 ID
      const cashMethod = (methodsRes.data || []).find(
        m => m.method_name && m.method_name.includes('現金')
      )
      setCashMethodId(cashMethod?.id ?? null)

      // 所有角色都預設帶入目前登入者作為申請人
      const myMember = membersList.find(m => m.full_name === profile.full_name)
      if (myMember) setApplicantId(String(myMember.id))

      // user 角色：鎖定申請人欄位（不可更改）
      if (profile?.role === 'user') {
        setIsUserRole(true)
      }

      // 預設主管為楊澤宇（若存在）
      const defaultSupervisor = membersList.find(m => m.full_name === '楊澤宇')
      if (defaultSupervisor) setSupervisorId(String(defaultSupervisor.id))

      // 產生 temp_id
      const tid = await generateTempId()
      setTempId(tid)
    } catch (err) {
      setError('載入資料失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── 產生臨時編號 T20260514-01 ─────────────────────────────
  async function generateTempId() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}${m}${day}`
    const prefix  = `T${dateStr}-`

    const { data } = await supabase
      .from('payment_requests')
      .select('temp_id')
      .like('temp_id', `${prefix}%`)
      .order('temp_id', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastSeq = parseInt(data[0].temp_id.split('-').pop(), 10) || 0
      return `${prefix}${String(lastSeq + 1).padStart(2, '0')}`
    }
    return `${prefix}01`
  }

  // ── 明細變更（含自動帶入）────────────────────────────────
  function handleItemChange(index, field, value) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // 選「會計科目」→ 自動帶入支出分類
      if (field === 'subject_id') {
        const subject = subjects.find(s => String(s.id) === String(value))
        updated[index].category_name = subject?.category_name ?? ''
      }

      // 選「會計科目名稱」→ 自動帶入會計項目編號 + 項目名稱
      if (field === 'detail_id') {
        const detail = detailItems.find(d => String(d.id) === String(value))
        updated[index].account_code = detail?.account_code ?? ''
        updated[index].account_name = detail?.account_name ?? ''
      }

      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, newEmptyItem()])
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // ── 表單驗證 ──────────────────────────────────────────────
  function validate() {
    if (!applicantId) return '請選擇申請人'
    if (items.length === 0) return '請新增至少一筆支出明細'
    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) return `明細 #${i + 1}：品項為必填`
      if (!items[i].amount || isNaN(parseFloat(items[i].amount))) {
        return `明細 #${i + 1}：金額為必填`
      }
      if (parseFloat(items[i].amount) <= 0) {
        return `明細 #${i + 1}：金額必須大於 0`
      }
    }
    return null
  }

  // ── 儲存草稿 ──────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const errMsg = validate()
    if (errMsg) { setError(errMsg); return }

    setSaving(true)
    setError(null)

    try {
      // 1. 新增 payment_request
      const { data: request, error: reqError } = await supabase
        .from('payment_requests')
        .insert({
          temp_id:           tempId,
          status:            0,
          applicant_id:      applicantId  !== '' ? applicantId  : null,
          supervisor_id:     supervisorId !== '' ? supervisorId : null,
          payment_method_id: cashMethodId ?? null,
          total_amount:      totalAmount,
        })
        .select()
        .single()

      if (reqError) throw reqError

      // 2. 新增 expense_items
      const itemsToInsert = items.map(item => ({
        request_id:    request.id,
        invoice_date:  item.invoice_date  || null,
        invoice_no:    item.invoice_no    || null,
        budget_type:   parseInt(item.budget_type),
        fund_id:       item.fund_id       !== '' ? item.fund_id    : null,
        subject_id:    item.subject_id    !== '' ? item.subject_id : null,
        detail_id:     item.detail_id     !== '' ? item.detail_id  : null,
        activity_name: item.activity_name || null,
        item_name:     item.item_name.trim(),
        amount:        parseFloat(item.amount),
        payer_id:      item.payer_id      !== '' ? item.payer_id   : null,
        note:       item.note       || null,
      }))

      const { error: itemsError } = await supabase
        .from('expense_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      navigate('/expense')
    } catch (err) {
      setError('儲存失敗：' + err.message)
      setSaving(false)
    }
  }

  // ── 載入畫面 ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        載入中...
      </div>
    )
  }

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">
      {/* 頁首 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">新增請款單</h2>
        <p className="text-sm text-gray-500 mt-0.5">填寫支出請款資料，儲存後為草稿狀態</p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── 基本資訊 ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">基本資訊</h3>
          <div className="grid grid-cols-2 gap-4">

            {/* 臨時編號 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">臨時編號</label>
              <input
                type="text" value={tempId} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono"
              />
            </div>

            {/* 申請日期 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">申請日期</label>
              <input
                type="text" value={applicationDate} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>

            {/* 申請人 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                申請人 <span className="text-red-500">*</span>
              </label>
              {isUserRole ? (
                <input
                  type="text"
                  value={members.find(m => String(m.id) === String(applicantId))?.full_name ?? ''}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
              ) : (
                <select
                  value={applicantId}
                  onChange={e => setApplicantId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 主管 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">主管</label>
              <select
                value={supervisorId}
                onChange={e => setSupervisorId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇</option>
                {supervisors.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            {/* 預算部門 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">預算部門</label>
              <input
                type="text" value="中原生命樹" readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>

            {/* 支出方式 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">支出方式</label>
              <input
                type="text" value="現金-3" readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>

          </div>
        </div>

        {/* ── 支出明細 ──────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">支出明細</h3>
            <span className="text-xs text-gray-400">{items.length} 筆</span>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
                {/* 明細標題列 */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    明細 #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs text-red-400 hover:text-red-600 transition"
                    >
                      刪除此筆
                    </button>
                  )}
                </div>

                {/* 第1列：發票日期、發票號碼、預算科目 */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">發票日期</label>
                    <input
                      type="date"
                      value={item.invoice_date}
                      onChange={e => handleItemChange(index, 'invoice_date', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">發票號碼</label>
                    <input
                      type="text"
                      value={item.invoice_no}
                      onChange={e => handleItemChange(index, 'invoice_no', e.target.value)}
                      placeholder="AB-12345678"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">預算科目</label>
                    <select
                      value={item.budget_type}
                      onChange={e => handleItemChange(index, 'budget_type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">一般費用</option>
                      <option value="2">人事費用</option>
                    </select>
                  </div>
                </div>

                {/* 第2列：事工專款 ＋ 會計科目（→ 自動帶入支出分類） */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">事工專款</label>
                    <select
                      value={item.fund_id}
                      onChange={e => handleItemChange(index, 'fund_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">請選擇</option>
                      {funds.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">會計科目</label>
                    <select
                      value={item.subject_id}
                      onChange={e => handleItemChange(index, 'subject_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">請選擇</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.subject_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 第3列：會計科目名稱（自動帶入 account_code / account_name，不顯示） */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">會計科目名稱</label>
                  <select
                    value={item.detail_id}
                    onChange={e => handleItemChange(index, 'detail_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請選擇</option>
                    {detailItems.map(d => (
                      <option key={d.id} value={d.id}>{d.item_detail_name}</option>
                    ))}
                  </select>
                </div>

                {/* 第4列：活動名稱、品項、金額、代墊人員 */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">活動名稱</label>
                    <input
                      type="text"
                      value={item.activity_name}
                      onChange={e => handleItemChange(index, 'activity_name', e.target.value)}
                      placeholder="0514主日…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      品項 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                      placeholder="購買文具"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      金額 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={e => handleItemChange(index, 'amount', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">代墊人員</label>
                    <select
                      value={item.payer_id}
                      onChange={e => handleItemChange(index, 'payer_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">請選擇</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 第5列：備註 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">備註</label>
                  <input
                    type="text"
                    value={item.note}
                    onChange={e => handleItemChange(index, 'note', e.target.value)}
                    placeholder="選填"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 新增明細按鈕 */}
          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition"
          >
            ＋ 新增明細
          </button>
        </div>

        {/* ── 底部操作列 ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between sticky bottom-0">
          <div className="text-base font-bold text-gray-800">
            總金額：
            <span className="text-blue-600 ml-2 tabular-nums">
              NT$ {totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/expense')}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? '儲存中…' : '儲存草稿'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
