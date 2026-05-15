import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../api/index.js'

export default function AdminPanel() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msgModal, setMsgModal] = useState(null)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
    } catch {
      toast.error('Помилка завантаження')
    }
    setLoading(false)
  }

  const changeRole = async (id, currentRole) => {
    const newRole = currentRole === 'ROOT' ? 'USER' : 'ROOT'
    if (!window.confirm(`Змінити роль на ${newRole}?`)) return
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole })
      toast.success(`Роль змінено на ${newRole}`)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
  }

  const toggleBlock = async (id, blocked, name) => {
    if (!window.confirm(`${blocked ? 'Розблокувати' : 'Заблокувати'} ${name}?`)) return
    try {
      await api.patch(`/admin/users/${id}/block`)
      toast.success(blocked ? `${name} розблоковано` : `${name} заблоковано`)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
  }

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Видалити ${name} та всі його дані? Це незворотно!`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      toast.success('Користувача видалено')
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
  }

  const sendMessage = async () => {
    if (!msg.trim()) { toast.error('Введи текст повідомлення'); return }
    setSending(true)
    try {
      await api.post('/admin/messages', { toId: msgModal.id, text: msg })
      toast.success(`Повідомлення надіслано ${msgModal.name}!`)
      setMsg('')
      setMsgModal(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Помилка')
    }
    setSending(false)
  }

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMsgModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (loading) return <div style={s.loading}>Завантаження...</div>

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>⚙️ Адмін панель</h1>
          <p style={s.subtitle}>Керування користувачами та система повідомлень</p>
        </div>
        <div style={s.rootBadge}>
          <i className="ti ti-shield-check" /> ROOT доступ
        </div>
      </div>

      {/* Статистика */}
      <div style={s.statsGrid}>
        {[
          { icon: 'ti-users', bg: '#EEEDFE', color: '#534AB7', label: 'Користувачів', val: stats?.usersCount },
          { icon: 'ti-arrows-exchange', bg: '#EAF3DE', color: '#3B6D11', label: 'Транзакцій', val: stats?.txCount },
          { icon: 'ti-trending-up', bg: '#EAF3DE', color: '#3B6D11', label: 'Загальні доходи', val: `₴${stats?.totalIncome?.toLocaleString()}` },
          { icon: 'ti-trending-down', bg: '#FAECE7', color: '#993C1D', label: 'Загальні витрати', val: `₴${stats?.totalExpense?.toLocaleString()}` },
        ].map((item, i) => (
          <div key={i} style={s.statCard}>
            <div style={{ ...s.statIcon, background: item.bg }}>
              <i className={`ti ${item.icon}`} style={{ color: item.color, fontSize: 20 }} />
            </div>
            <div style={s.statLabel}>{item.label}</div>
            <div style={s.statVal}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Список користувачів */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.sectionTitle}>Користувачі системи</div>
          <div style={s.userCount}>{users.length} користувачів</div>
        </div>

        {users.map(u => (
          <div key={u.id} style={{ ...s.userRow, opacity: u.blocked ? 0.55 : 1 }}>
            <div style={{ ...s.avatar, background: u.role === 'ROOT' ? '#EEEDFE' : '#f5f5f5', color: u.role === 'ROOT' ? '#534AB7' : '#888' }}>
              {u.name[0].toUpperCase()}
            </div>

            <div style={s.userInfo}>
              <div style={s.userName}>
                {u.name}
                {u.blocked && (
                  <span style={s.blockedTag}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} /> заблоковано
                  </span>
                )}
              </div>
              <div style={s.userMeta}>
                {u.email} · {u._count.transactions} транзакцій · з {new Date(u.createdAt).toLocaleDateString('uk')}
              </div>
            </div>

            <span style={{ ...s.roleBadge, ...(u.role === 'ROOT' ? s.rootRole : s.userRole) }}>
              {u.role}
            </span>

            {u.role !== 'ROOT' && (
              <div style={s.actions}>
                <button onClick={() => changeRole(u.id, u.role)} style={s.actionBtn} title="Змінити роль">
                  <i className="ti ti-shield" style={{ fontSize: 14 }} />
                  <span>→ ROOT</span>
                </button>

                <button
                  onClick={() => toggleBlock(u.id, u.blocked, u.name)}
                  style={{ ...s.actionBtn, ...(u.blocked ? s.unblockBtn : s.blockBtn) }}>
                  <i className={`ti ${u.blocked ? 'ti-lock-open' : 'ti-lock'}`} style={{ fontSize: 14 }} />
                  <span>{u.blocked ? 'Розблокувати' : 'Заблокувати'}</span>
                </button>

                <button onClick={() => { setMsgModal(u); setMsg('') }} style={{ ...s.actionBtn, ...s.msgBtn }}>
                  <i className="ti ti-message" style={{ fontSize: 14 }} />
                  <span>Повідомлення</span>
                </button>

                <button onClick={() => deleteUser(u.id, u.name)} style={{ ...s.actionBtn, ...s.deleteBtn }}>
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                  <span>Видалити</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модалка повідомлення — через portal щоб завжди бути поверх всього */}
      {msgModal && createPortal(
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setMsgModal(null)}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Повідомлення для {msgModal.name}</h3>
              <button onClick={() => setMsgModal(null)} style={s.closeBtn}>
                <i className="ti ti-x" style={{ fontSize: 18 }} />
              </button>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Отримувач</label>
              <div style={s.recipientRow}>
                <div style={s.recipientAvatar}>{msgModal.name[0].toUpperCase()}</div>
                <div>
                  <div style={s.recipientName}>{msgModal.name}</div>
                  <div style={s.recipientEmail}>{msgModal.email}</div>
                </div>
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Текст повідомлення</label>
              <textarea
                style={s.textarea}
                placeholder="Введи повідомлення для користувача..."
                value={msg}
                onChange={e => setMsg(e.target.value)}
                rows={5}
                autoFocus
              />
              <div style={s.charCount}>{msg.length} символів</div>
            </div>

            <div style={s.modalBtns}>
              <button onClick={() => { setMsgModal(null); setMsg('') }} style={s.cancelBtn}>
                Скасувати
              </button>
              <button onClick={sendMessage} style={{ ...s.sendBtn, opacity: sending ? 0.7 : 1 }} disabled={sending}>
                <i className="ti ti-send" style={{ fontSize: 14 }} />
                {sending ? 'Надсилання...' : 'Надіслати'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const s = {
  loading: { padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--color-text-tertiary)' },
  rootBadge: { display: 'flex', alignItems: 'center', gap: 6, background: '#EEEDFE', color: '#534AB7', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 },
  statCard: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 18px' },
  statIcon: { width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' },
  card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '20px 20px 8px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' },
  userCount: { fontSize: 12, color: 'var(--color-text-tertiary)' },
  userRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' },
  avatar: { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 },
  userMeta: { fontSize: 12, color: 'var(--color-text-tertiary)' },
  blockedTag: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, background: '#FAECE7', color: '#993C1D', padding: '2px 8px', borderRadius: 20 },
  roleBadge: { padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, flexShrink: 0 },
  rootRole: { background: '#EEEDFE', color: '#534AB7' },
  userRole: { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' },
  actions: { display: 'flex', gap: 6 },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' },
  blockBtn: { color: '#985A00', borderColor: '#F5CBA7', background: '#FEF9F0' },
  unblockBtn: { color: '#3B6D11', borderColor: '#A9D18E', background: '#F0F7EC' },
  msgBtn: { color: '#534AB7', borderColor: '#AFA9EC', background: '#F5F4FE' },
  deleteBtn: { color: '#993C1D', borderColor: '#F5B8A8', background: '#FEF2EE' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' },
  modal: { background: 'var(--color-background-primary, #fff)', borderRadius: 16, padding: 28, width: 460, maxWidth: '92vw', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '0.5px solid var(--color-border-tertiary)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', padding: 4, borderRadius: 6 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' },
  recipientRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-background-secondary)', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)' },
  recipientAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', color: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, flexShrink: 0 },
  recipientName: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' },
  recipientEmail: { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 },
  textarea: { padding: '12px 14px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 },
  charCount: { fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4 },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: '10px 20px', background: 'none', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  sendBtn: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
}
