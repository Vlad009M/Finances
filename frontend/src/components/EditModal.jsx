import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../api/index.js'

export default function EditModal({ transaction, categories, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: transaction.amount,
    type: transaction.type,
    description: transaction.description || '',
    categoryId: transaction.categoryId,
    date: new Date(transaction.date).toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter(c => c.type === form.type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.categoryId) {
      toast.error('Заповни всі поля')
      return
    }
    setLoading(true)
    try {
      await api.put(`/transactions/${transaction.id}`, form)
      toast.success('Транзакцію оновлено!')
      onSuccess()
      onClose()
    } catch {
      toast.error('Помилка оновлення')
    }
    setLoading(false)
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return createPortal(
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Редагувати транзакцію</div>
          <button onClick={onClose} style={s.closeBtn}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Тип</label>
            <select style={s.select} value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value, categoryId: '' })}>
              <option value="expense">💸 Витрата</option>
              <option value="income">💵 Дохід</option>
            </select>
          </div>

          <div style={s.row}>
            <div style={{ ...s.fieldGroup, flex: 1 }}>
              <label style={s.label}>Сума ₴</label>
              <input style={s.input} type="number" min="0.01" step="0.01"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div style={{ ...s.fieldGroup, flex: 1 }}>
              <label style={s.label}>Дата</label>
              <input style={s.input} type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Категорія</label>
            <select style={s.select} value={form.categoryId}
              onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Оберіть категорію</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Опис</label>
            <input style={s.input} type="text" placeholder="Необов'язково"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div style={s.btnRow}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Скасувати</button>
            <button type="submit" style={{ ...s.saveBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'var(--color-background-primary, #fff)',
    borderRadius: 16,
    padding: 28,
    width: 440,
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 500,
    color: 'var(--color-text-primary, #111)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-tertiary, #aaa)',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'flex', gap: 12 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-secondary, #555)',
  },
  input: {
    padding: '9px 12px',
    border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: 'var(--color-background-secondary, #fafafa)',
    color: 'var(--color-text-primary, #111)',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '9px 12px',
    border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: 'var(--color-background-secondary, #fafafa)',
    color: 'var(--color-text-primary, #111)',
    width: '100%',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    padding: '9px 18px',
    background: 'none',
    border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--color-text-secondary, #555)',
  },
  saveBtn: {
    padding: '9px 18px',
    background: '#7F77DD',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
}