import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../api/index.js'

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
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const compressImage = (file, maxSizeMB = 2) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Зменшуємо розміри якщо дуже велике
        const maxDim = 1024
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
          else { width = Math.round(width * maxDim / height); height = maxDim }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Стискаємо з якістю 0.8, потім зменшуємо якщо треба
        let quality = 0.85
        let dataUrl = canvas.toDataURL('image/jpeg', quality)

        while (dataUrl.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        // Конвертуємо dataUrl назад у File
        const arr = dataUrl.split(',')
        const mime = arr[0].match(/:(.*?);/)[1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) u8arr[n] = bstr.charCodeAt(n)
        resolve(new File([u8arr], 'avatar.jpg', { type: mime }))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  setUploading(true)
  try {
    // Завжди стискаємо у JPEG (≤2MB) — бекенд приймає лише JPEG
    const compressed = await compressImage(file)
    const base64 = await fileToBase64(compressed)

    // Аплоад ЧЕРЕЗ бекенд (валідація magic-bytes + service-role), не напряму в Supabase
    const res = await api.post('/user/avatar', { image: base64 })
    const url = res.data.user.avatarUrl
    setAvatarUrl(url)

    const updated = { ...user, ...res.data.user }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    window.dispatchEvent(new Event('user-updated'))
    onUpdate(updated)

    toast.success('Фото завантажено і збережено!')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Помилка завантаження фото')
  }
  setUploading(false)
}

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await api.put('/user/profile', { name })
      const updated = { ...user, ...res.data.user }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      window.dispatchEvent(new Event('user-updated'))
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

  const handleDeleteAccount = async () => {
  if (deleteConfirm !== 'ВИДАЛИТИ') { toast.error('Введи слово ВИДАЛИТИ'); return }
  setDeleting(true)
  try {
    await api.delete('/user/account')
    localStorage.removeItem('user')
    window.location.href = '/login'
  } catch (e) {
    toast.error(e.response?.data?.error || 'Помилка')
  }
  setDeleting(false)
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
          <button style={{ ...s.tab, ...(tab === 'danger' ? s.tabActive : {}) }} onClick={() => setTab('danger')}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} /> Акаунт
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                {user.emailVerified
                  ? <><i className="ti ti-circle-check" style={{ fontSize: 13, color: '#639922' }} /><span style={{ fontSize: 11, color: '#639922' }}>Верифікований</span></>
                  : <><i className="ti ti-circle-x" style={{ fontSize: 13, color: '#993C1D' }} /><span style={{ fontSize: 11, color: '#993C1D' }}>Не верифікований</span></>
                }
              </div>
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
                onChange={e => setNewPassword(e.target.value)} required minLength={8} placeholder="Мін. 8 символів, велика літера, цифра, спецсимвол" />
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

            <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Підозрюєте, що ваш акаунт скомпрометовано? Ви можете примусово завершити всі активні сесії на інших пристроях.
              </div>
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  if (!window.confirm('Ви впевнені, що хочете вийти з усіх пристроїв?')) return;
                  try {
                    await api.post('/user/logout-all');
                    toast.success('Успішно вийшли з усіх пристроїв');
                    // Опційно: розлогінити і поточний пристрій
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  } catch (err) {
                    toast.error('Помилка при виході з пристроїв');
                  }
                }}
                style={{ padding: '9px 16px', background: '#FEF2EE', color: '#993C1D', border: '1px solid #F5B8A8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500, width: '100%' }}
              >
                Вийти з усіх пристроїв
              </button>
            </div>
          </form>
        )}

{tab === 'danger' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ background: '#FAECE7', border: '0.5px solid #F5B8A8', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#993C1D', marginBottom: 6 }}>
        ⚠️ Видалення акаунту
      </div>
      <div style={{ fontSize: 12, color: '#993C1D', lineHeight: 1.6 }}>
        Ця дія незворотна. Всі твої транзакції, категорії, бюджети та досягнення будуть видалені назавжди.
      </div>
    </div>
    <div style={s.field}>
      <label style={s.label}>Для підтвердження введи слово <strong>ВИДАЛИТИ</strong></label>
      <input
        style={{ ...s.input, borderColor: deleteConfirm && deleteConfirm !== 'ВИДАЛИТИ' ? '#F5B8A8' : undefined }}
        type="text"
        value={deleteConfirm}
        onChange={e => setDeleteConfirm(e.target.value)}
        placeholder="ВИДАЛИТИ"
      />
    </div>
    <button
      onClick={handleDeleteAccount}
      disabled={deleting || deleteConfirm !== 'ВИДАЛИТИ'}
      style={{ padding: '10px 0', background: deleteConfirm === 'ВИДАЛИТИ' ? '#993C1D' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: deleteConfirm === 'ВИДАЛИТИ' ? 'pointer' : 'not-allowed', fontWeight: 500, opacity: deleting ? 0.7 : 1 }}
    >
      {deleting ? 'Видалення...' : 'Видалити акаунт назавжди'}
    </button>
  </div>
)}

        {/* Підтримка розробника */}
<div style={{ marginTop: 8, padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 8, textAlign: 'center' }}>
  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, lineHeight: 1.5 }}>
    ☕ Якщо Aperio економить твій час і гроші — можеш віддячити розробнику
  </div>
  <a
    href="https://send.monobank.ua/jar/93HaeWmhhg"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'linear-gradient(135deg, #1A1F71, #2B3DE0)', color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
  >
    ☕ Купити каву
  </a>
</div>
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
