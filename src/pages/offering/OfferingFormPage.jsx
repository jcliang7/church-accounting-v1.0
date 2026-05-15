import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const ANONYMOUS_DONOR_ID = '217083cb-b291-4860-8a44-6958d0fe0d62'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const EMPTY_FORM = {
  offering_type_id:  '',
  account_name:      '',   // 顯示用，不存 DB（從 offering_types.default_account 帶入）
  fund_id:           '',
  donor_id:          '',
  is_anonymous:      false,
  offering_detail:   '',   // 奉獻明細，例如：5/10主日、特兒家庭營募款
  amount:            '',
  offering_date:     todayStr(),
  accounting_week:   '',
  payment_method_id: '',   // 直接對應 payment_methods.id
  bank_account_id:   '',
  transfer_info:     '',
  receipt_pref:      '0',  // 0=待確認 1=單次 2=年度 3=不需要
  note:           '',
}

// ── 奉獻者搜尋 Combobox ──────────────────────────────────────
function DonorCombobox({ donors, donorId, onSelect, onQuickAdd }) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const wrapRef             = useRef(null)

  // 外部清除 donor 時，同步清空輸入框
  useEffect(() => { if (!donorId) setQuery('') }, [donorId])

  // 選到 donor 後，把名字填入輸入框
  useEffect(() => {
    const d = donors.find(d => String(d.id) === String(donorId))
    if (d) setQuery(d.name)
  }, [donorId, donors])

  const filtered = donors
    .filter(d => !query || d.name.includes(query))
    .slice(0, 20)

  // 有輸入但搜尋不到結果時，才顯示快速新增
  const showQuickAdd = !!query && filtered.length === 0

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          if (!e.target.value) onSelect('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="輸入姓名搜尋…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (filtered.length > 0 || showQuickAdd) && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(d => {
            const code = d.main_id != null
              ? `${d.main_id}${d.sub_id && d.sub_id > 0 ? '-' + d.sub_id : ''} `
              : ''
            return (
              <button
                key={d.id}
                type="button"
                onMouseDown={() => { onSelect(String(d.id)); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="text-gray-400 font-mono text-xs mr-1">{code}</span>
                {d.name}
              </button>
            )
          })}
          {showQuickAdd && (
            <button
              type="button"
              onMouseDown={() => { onQuickAdd(query); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 border-t border-gray-100"
            >
              ＋ 快速新增「{query}」
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────────
export default function OfferingFormPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  // 查詢資料
  const [offeringTypes,  setOfferingTypes]  = useState([])
  const [funds,          setFunds]          = useState([])
  const [donors,         setDonors]         = useState([])
  const [bankAccounts,   setBankAccounts]   = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])

  // 表單
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [isAutoFund, setIsAutoFund] = useState(false)  // 專款是否自動鎖定

  // 快速新增奉獻者
  const [showQuickAdd,  setShowQuickAdd]  = useState(false)
  const [quickAddName,  setQuickAddName]  = useState('')
  const [quickAdding,   setQuickAdding]   = useState(false)
  const [quickAddError, setQuickAddError] = useState(null)

  // UI
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  // ── 載入查詢資料 ──────────────────────────────────────────
  async function loadData() {
    try {
      const [typesRes, fundsRes, donorsRes, banksRes, methodsRes] = await Promise.all([
        supabase.from('offering_types').select('*').not('envelope_label', 'is', null).order('id'),
        supabase.from('ministry_funds').select('*').order('name'),
        supabase.from('donors').select('id, main_id, sub_id, name').eq('is_active', true).neq('id', ANONYMOUS_DONOR_ID).order('name'),
        supabase.from('bank_accounts').select('*').order('name'),
        supabase.from('payment_methods').select('*'),
      ])

      if (typesRes.error) throw typesRes.error

      setOfferingTypes(typesRes.data || [])
      setFunds(fundsRes.data || [])
      setDonors(donorsRes.data || [])
      setBankAccounts(banksRes.data || [])

      const methods = methodsRes.data || []
      setPaymentMethods(methods)

      // 預設選第一個付款方式
      if (methods.length > 0) {
        setForm(prev => ({ ...prev, payment_method_id: String(methods[0].id) }))
      }
    } catch (err) {
      setError('載入資料失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── 選擇奉獻類別 → 自動帶入會計科目 + 事工專款 ──────────
  function handleTypeChange(typeId) {
    const type = offeringTypes.find(t => String(t.id) === String(typeId))
    if (!type) {
      setForm(prev => ({ ...prev, offering_type_id: typeId, account_name: '', fund_id: '' }))
      setIsAutoFund(false)
      return
    }
    // 什一／感恩 → 固定帶入 fund_id=1（經常費＋人事費）並鎖定
    // 建殿／其他 → 開放下拉選單
    const autoFund = ['什一', '感恩'].includes(type.envelope_label)
    setForm(prev => ({
      ...prev,
      offering_type_id: typeId,
      account_name:     type.default_account || '',
      fund_id:          autoFund ? '1' : '',
    }))
    setIsAutoFund(autoFund)
  }

  // ── 快速新增奉獻者 ────────────────────────────────────────
  async function handleQuickAdd() {
    if (!quickAddName.trim()) return
    setQuickAdding(true)
    setQuickAddError(null)
    try {
      const { data, error: err } = await supabase
        .from('donors')
        .insert({ name: quickAddName.trim(), is_active: true, receipt_pref: 0 })
        .select()
        .single()
      if (err) throw err
      setDonors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')))
      setForm(prev => ({ ...prev, donor_id: String(data.id) }))
      setShowQuickAdd(false)
      setQuickAddName('')
    } catch (err) {
      setQuickAddError('新增失敗：' + err.message)
    } finally {
      setQuickAdding(false)
    }
  }

  // 判斷目前選擇的付款方式是否為轉帳
  const selectedMethod = paymentMethods.find(m => String(m.id) === String(form.payment_method_id))
  const isTransfer = selectedMethod?.method_name?.includes('轉帳') ?? false

  // ── 驗證 ──────────────────────────────────────────────────
  function validate() {
    if (!form.offering_type_id)              return '請選擇奉獻類別'
    if (!form.offering_detail.trim())        return '奉獻明細為必填'
    if (!form.amount || parseFloat(form.amount) <= 0) return '金額為必填且須大於 0'
    if (!form.offering_date)                 return '奉獻日期為必填'
    if (!form.accounting_week)               return '週別日期為必填'
    if (!form.is_anonymous && !form.donor_id) return '請選擇奉獻人，或勾選匿名'
    if (isTransfer && !form.bank_account_id) return '請選擇轉帳戶頭'
    return null
  }

  // ── 儲存 ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const errMsg = validate()
    if (errMsg) { setError(errMsg); return }

    setSaving(true)
    setError(null)

    const payload = {
      offering_type_id:  form.offering_type_id  || null,
      offering_detail:   form.offering_detail.trim() || null,
      fund_id:           form.fund_id            || null,
      donor_id:          form.is_anonymous ? ANONYMOUS_DONOR_ID : (form.donor_id || null),
      is_anonymous:      form.is_anonymous,
      amount:            parseFloat(form.amount),
      offering_date:     form.offering_date,
      accounting_week:   form.accounting_week,
      payment_method_id: form.payment_method_id  ? Number(form.payment_method_id) : null,
      bank_account_id:   isTransfer ? (form.bank_account_id || null) : null,
      transfer_info:     isTransfer ? (form.transfer_info   || null) : null,
      receipt_pref:      Number(form.receipt_pref),
      note:           form.note || null,
    }

    try {
      const { error: err } = await supabase.from('offerings').insert(payload)
      if (err) throw err
      navigate('/offerings')
    } catch (err) {
      setError('儲存失敗：' + err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中...</div>
  }

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">新增奉獻</h2>
        <p className="text-sm text-gray-500 mt-0.5">填寫奉獻收入資料</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

          {/* 奉獻類別 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              奉獻類別（信封上的類別，會計科目-打單） <span className="text-red-500">*</span>
            </label>
            <select
              value={form.offering_type_id}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">請選擇</option>
              {offeringTypes.map(t => (
                <option key={t.id} value={t.id}>{t.envelope_label}</option>
              ))}
            </select>
          </div>

          {/* 奉獻明細 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              奉獻明細 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.offering_detail}
              onChange={e => handleChange('offering_detail', e.target.value)}
              placeholder="例：5/10主日、特兒家庭營募款"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 會計科目（自動帶入，唯讀） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">會計科目</label>
            <input
              type="text"
              value={form.account_name}
              readOnly
              placeholder="選擇奉獻類別後自動帶入"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
          </div>

          {/* 事工專款 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">事工專款</label>
            {isAutoFund ? (
              <input
                type="text"
                value={funds.find(f => String(f.id) === String(form.fund_id))?.name || ''}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            ) : (
              <select
                value={form.fund_id}
                onChange={e => handleChange('fund_id', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇</option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 奉獻人 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">
                奉獻人 {!form.is_anonymous && <span className="text-red-500">*</span>}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_anonymous}
                  onChange={e => {
                    if (e.target.checked) {
                      setForm(prev => ({ ...prev, is_anonymous: true, donor_id: ANONYMOUS_DONOR_ID }))
                    } else {
                      setForm(prev => ({ ...prev, is_anonymous: false, donor_id: '' }))
                    }
                  }}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-600">匿名</span>
              </label>
            </div>
            {form.is_anonymous ? (
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-400">匿名奉獻</div>
            ) : (
              <DonorCombobox
                donors={donors}
                donorId={form.donor_id}
                onSelect={id => handleChange('donor_id', id)}
                onQuickAdd={name => { setQuickAddName(name); setShowQuickAdd(true) }}
              />
            )}
          </div>

          {/* 金額 + 奉獻日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                金額 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                奉獻日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.offering_date}
                onChange={e => handleChange('offering_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 週別日期 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              週別日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.accounting_week}
              onChange={e => handleChange('accounting_week', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">通常為當週主日日期；匯款則填匯款日</p>
          </div>

          {/* 存款方式 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">存款方式</label>
            <div className="flex gap-6">
              {paymentMethods.map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method_id"
                    value={String(m.id)}
                    checked={String(form.payment_method_id) === String(m.id)}
                    onChange={e => {
                      handleChange('payment_method_id', e.target.value)
                      // 切換非轉帳時清空轉帳欄位
                      if (!m.method_name?.includes('轉帳')) {
                        setForm(prev => ({ ...prev, payment_method_id: e.target.value, bank_account_id: '', transfer_info: '' }))
                      }
                    }}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{m.method_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 轉帳詳細（條件顯示） */}
          {isTransfer && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  戶頭 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.bank_account_id}
                  onChange={e => handleChange('bank_account_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">末五碼或匯款姓名</label>
                <input
                  type="text"
                  value={form.transfer_info}
                  onChange={e => handleChange('transfer_info', e.target.value)}
                  placeholder="12345 或 王小明"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 收據開立方式 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">收據開立方式</label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: '0', label: '待確認' },
                { value: '1', label: '單次收據' },
                { value: '2', label: '年度收據' },
                { value: '3', label: '不需要收據' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="receipt_pref"
                    value={opt.value}
                    checked={form.receipt_pref === opt.value}
                    onChange={e => handleChange('receipt_pref', e.target.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">備註</label>
            <textarea
              value={form.note}
              onChange={e => handleChange('note', e.target.value)}
              placeholder="選填"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

        </div>

        {/* 底部操作列 */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/offerings')}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>

      {/* ── 快速新增奉獻者 Modal ─────────────────────────────── */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">新增奉獻者</h3>
            <p className="text-sm text-gray-600 mb-4">
              將新增「<span className="font-medium text-gray-800">{quickAddName}</span>」為奉獻者，其他資料可稍後在奉獻者管理頁補填。
            </p>
            {quickAddError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-xs">
                {quickAddError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickAdd(false)
                  setQuickAddName('')
                  setQuickAddError(null)
                  setForm(prev => ({ ...prev, donor_id: '' }))
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={quickAdding}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {quickAdding ? '新增中…' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
