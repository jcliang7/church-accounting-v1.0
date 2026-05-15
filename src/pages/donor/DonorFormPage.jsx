import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const EMPTY_FORM = {
  main_id:      '',
  sub_id:       '',
  name:         '',
  phone:        '',
  email:        '',
  address:      '',
  receipt_pref: '0',   // 0=不需要, 1=單次, 2=年度
  note:         '',
}

export default function DonorFormPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { id }      = useParams()          // 有 id → 編輯模式
  const isEdit      = Boolean(id)
  const isAdmin     = profile?.role === 'admin'

  const [form,    setForm]    = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)  // 編輯模式才需要載入
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  // 非 admin 不能進入此頁
  useEffect(() => {
    if (profile && !isAdmin) navigate('/donors', { replace: true })
  }, [profile])

  // 編輯模式：載入現有資料
  useEffect(() => {
    if (isEdit) fetchDonor()
  }, [id])

  async function fetchDonor() {
    try {
      const { data, error: err } = await supabase
        .from('donors')
        .select('*')
        .eq('id', id)
        .single()
      if (err) throw err
      setForm({
        main_id:      data.main_id      ?? '',
        sub_id:       data.sub_id       ?? '',
        name:         data.name         ?? '',
        phone:        data.phone        ?? '',
        email:        data.email        ?? '',
        address:      data.address      ?? '',
        receipt_pref: String(data.receipt_pref ?? 0),
        note:         data.note         ?? '',
      })
    } catch (err) {
      setError('載入失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.name.trim()) return '姓名為必填'
    if (form.main_id !== '' && isNaN(Number(form.main_id))) return '主編號須為數字'
    if (form.sub_id  !== '' && isNaN(Number(form.sub_id)))  return '副編號須為數字'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email 格式不正確'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errMsg = validate()
    if (errMsg) { setError(errMsg); return }

    setSaving(true)
    setError(null)

    const payload = {
      main_id:      form.main_id !== '' ? Number(form.main_id) : null,
      sub_id:       form.sub_id  !== '' ? Number(form.sub_id)  : null,
      name:         form.name.trim(),
      phone:        form.phone.trim()   || null,
      email:        form.email.trim()   || null,
      address:      form.address.trim() || null,
      receipt_pref: Number(form.receipt_pref),
      note:         form.note.trim()    || null,
    }

    try {
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('donors')
          .update(payload)
          .eq('id', id)
          .select()
        console.log('[donor update] data:', data, 'error:', err)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase
          .from('donors')
          .insert(payload)
          .select()
        console.log('[donor insert] data:', data, 'error:', err)
        if (err) throw err
      }
      navigate('/donors')
    } catch (err) {
      setError('儲存失敗：' + err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">載入中...</div>
  }

  return (
    <div className="max-w-2xl">
      {/* 頁首 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEdit ? '編輯奉獻者' : '新增奉獻者'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">填寫奉獻者基本資料</p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

          {/* 編號 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                主編號
                <span className="ml-1 text-gray-400 font-normal">（可留空）</span>
              </label>
              <input
                type="number"
                value={form.main_id}
                onChange={e => handleChange('main_id', e.target.value)}
                placeholder="例：1"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                副編號
                <span className="ml-1 text-gray-400 font-normal">（0＝主要成員）</span>
              </label>
              <input
                type="number"
                value={form.sub_id}
                onChange={e => handleChange('sub_id', e.target.value)}
                placeholder="例：0"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 姓名 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="請輸入姓名"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 電話 / Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">電話</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="0912-345-678"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 地址 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              地址
              <span className="ml-1 text-gray-400 font-normal">（寄送收據用）</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="桃園市中壢區…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">備註</label>
            <textarea
              value={form.note}
              onChange={e => handleChange('note', e.target.value)}
              placeholder="選填"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

        </div>

        {/* 底部操作列 */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/donors')}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? '儲存中…' : isEdit ? '儲存變更' : '新增奉獻者'}
          </button>
        </div>
      </form>
    </div>
  )
}
