import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../api/index.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function ProfileModal({ onClose, onUpdate }) {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'))
  const [tab, setTab] = useState('general')

  const [name, setName] = useState(user.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [uploading, setUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const fileRef = useRef()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Файл не більше 2MB'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
      toast.success('Фото завантажено!')
    } catch {
      toast.error('Помилка завантаження фото')
    }
    setUploading(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await api.put('/user/profile', { name, avatarUrl: avatarUrl || null })
      const updated = { ...user, ...res.data.user }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      toast.success('Профіль оновлено!')
      onUpdate(updated)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
    setSavingProfile(false)
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Паролі не співпадають'); return }
    setSavingPassword(true)
    try {
      await api.put('/user/password', { oldPassword, newPassword })
      toast.success('Пароль змінено!')
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
    setSavingPassword(false)
  }

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'VL'

  return createPortal(
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        <div style={s.header}>
          <div style={s.title}>Особистий кабінет</div>
          <button onClick={onClose} style={s.closeBtn}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(tab === 'general' ? s.tabActive : {}) }} onClick={() => setTab('general')}>
            <i className="ti ti-user" style={{ fontSize: 14 }} /> Загальні
          </button>
          <button style={{ ...s.tab, ...(tab === 'security' ? s.tabActive : {}) }} onClick={() => setTab('security')}>
            <i className="ti ti-lock" style={{ fontSize: 14 }} /> Безпека
          </button>
        </div>

        {tab === 'general' && (
          <form onSubmit={handleSaveProfile} style={s.form}>
            <div style={s.avatarSection}>
              <div style={s.avatarWrap}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={s.avatarImg} />
                  : <div style={s.avatarFallback}>{initials}</div>
                }
                {uploading && <div style={s.avatarOverlay}><i className="ti ti-loader" /></div>}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} style={s.uploadBtn} disabled={uploading}>
                  <i className="ti ti-camera" style={{ fontSize: 14 }} />
                  {uploading ? 'Завантаження...' : 'Змінити фото'}
                </button>
                <div style={s.uploadHint}>JPG або PNG, до 2MB</div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Ім'я</label>
              <input style={s.input} type="text" value={name}
                onChange={e => setName(e.target.value)} required minLength={2} maxLength={50} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input style={{ ...s.input, opacity: 0.55, cursor: 'not-allowed' }} type="email" value={user.email || ''} readOnly />
            </div>

            <div style={s.field}>
              <label style={s.label}>Роль</label>
              <div style={{ ...s.roleBadge, ...(user.role === 'ROOT' ? s.rootBadge : s.userBadge) }}>
                <i className={`ti ${user.role === 'ROOT' ? 'ti-shield-check' : 'ti-user'}`} style={{ fontSize: 13 }} />
                {user.role === 'ROOT' ? 'Адміністратор' : 'Особистий'}
              </div>
            </div>

            <button type="submit" style={{ ...s.saveBtn, opacity: savingProfile ? 0.7 : 1 }} disabled={savingProfile}>
              {savingProfile ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={handleSavePassword} style={s.form}>
            <div style={s.infoBox}>
              <i className="ti ti-info-circle" style={{ fontSize: 14 }} />
              Після зміни пароля потрібно буде увійти знову на інших пристроях
            </div>

            <div style={s.field}>
              <label style={s.label}>Поточний пароль</label>
              <input style={s.input} type="password" value={oldPassword}
                onChange={e => setOldPassword(e.target.value)} required placeholder="Введи поточний пароль" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Новий пароль</label>
              <input style={s.input} type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Мінімум 6 символів" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Підтвердження нового пароля</label>
              <input
                style={{ ...s.input, borderColor: confirmPassword && newPassword !== confirmPassword ? '#F5B8A8' : undefined }}
                type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required placeholder="Повтори новий пароль" />
              {confirmPassword && newPassword !== confirmPassword && (
                <div style={s.errorHint}>Паролі не співпадають</div>
              )}
            </div>

            <button type="submit" style={{ ...s.saveBtn, opacity: savingPassword ? 0.7 : 1 }} disabled={savingPassword}>
              {savingPassword ? 'Збереження...' : 'Змінити пароль'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' },
  modal: { background: 'var(--color-background-primary, #fff)', borderRadius: 16, padding: 28, width: 460, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary, #111)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', padding: 4, borderRadius: 6 },
  tabs: { display: 'flex', gap: 4, background: 'var(--color-background-tertiary, #f4f5f7)', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: 400 },
  tabActive: { background: 'var(--color-background-primary, #fff)', color: '#534AB7', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  avatarSection: { display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatarImg: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #EEEDFE' },
  avatarFallback: { width: 64, height: 64, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 500, color: '#534AB7' },
  avatarOverlay: { position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  uploadBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#EEEDFE', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#534AB7', fontWeight: 500, marginBottom: 6 },
  uploadHint: { fontSize: 11, color: 'var(--color-text-tertiary)' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' },
  input: { padding: '9px 12px', border: '0.5px solid var(--color-border-tertiary, #e0e0e0)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-background-secondary, #fafafa)', color: 'var(--color-text-primary)', width: '100%', boxSizing: 'border-box' },
  roleBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, width: 'fit-content' },
  rootBadge: { background: '#EEEDFE', color: '#534AB7' },
  userBadge: { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' },
  infoBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#F5F4FE', border: '0.5px solid #AFA9EC', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#534AB7' },
  errorHint: { fontSize: 11, color: '#993C1D', marginTop: 2 },
  saveBtn: { padding: '10px 0', background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500, marginTop: 4 },
}
