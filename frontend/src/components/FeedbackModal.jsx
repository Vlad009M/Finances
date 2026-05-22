import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import api from '../api/index.js'

const TYPES = [
  { value: 'bug',   emoji: '🐛', label: 'Знайшов баг',  sub: 'Щось зламалося' },
  { value: 'idea',  emoji: '💡', label: 'Є ідея',        sub: 'Пропозиція фічі' },
  { value: 'other', emoji: '❓', label: 'Інше',          sub: 'Загальний відгук' },
]

export default function FeedbackModal({ onClose }) {
  const [type, setType] = useState('idea')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) {
      toast.error('Напиши своє повідомлення')
      return
    }
    if (text.trim().length < 10) {
      toast.error('Повідомлення занадто коротке')
      return
    }
    setLoading(true)
    try {
      await api.post('/feedback', { type, text: text.trim() })
      toast.success('Дякуємо за відгук! 🙌')
      onClose()
    } catch {
      toast.error('Помилка відправки. Спробуй ще раз.')
    }
    setLoading(false)
  }

  return createPortal(
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>Залишити відгук</div>
            <div style={s.modalSub}>Допоможи зробити Aperio кращим</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Type selector */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Тип відгуку</label>
            <div style={s.typeRow}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    ...s.typeBtn,
                    ...(type === t.value ? s.typeBtnActive : {})
                  }}
                >
                  <span style={s.typeEmoji}>{t.emoji}</span>
                  <span style={s.typeLabel}>{t.label}</span>
                  <span style={s.typeSub}>{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Повідомлення
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
                ({text.length}/2000)
              </span>
            </label>
            <textarea
              style={s.textarea}
              placeholder={
                type === 'bug'
                  ? 'Опиши що сталося і як це відтворити...'
                  : type === 'idea'
                  ? 'Яку фічу хотів би бачити і навіщо вона потрібна?'
                  : 'Напиши що думаєш про Aperio...'
              }
              value={text}
              onChange={e => setText(e.target.value.slice(0, 2000))}
              rows={5}
              required
            />
          </div>

          {/* Buttons */}
          <div style={s.btnRow}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>
              Скасувати
            </button>
            <button
              type="submit"
              style={{ ...s.saveBtn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Надсилання...' : 'Надіслати відгук'}
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
    width: 480,
    maxWidth: '92vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 500,
    color: 'var(--color-text-primary, #111)',
    marginBottom: 3,
  },
  modalSub: {
    fontSize: 12,
    color: 'var(--color-text-tertiary, #aaa)',
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
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-secondary, #555)',
  },
  typeRow: {
    display: 'flex',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
    borderRadius: 10,
    background: 'var(--color-background-secondary, #fafafa)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  typeBtnActive: {
    border: '1.5px solid #7F77DD',
    background: '#EEEDFE',
  },
  typeEmoji: {
    fontSize: 22,
    lineHeight: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-primary, #111)',
  },
  typeSub: {
    fontSize: 10,
    color: 'var(--color-text-tertiary, #aaa)',
    textAlign: 'center',
  },
  textarea: {
    padding: '10px 12px',
    border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: 'var(--color-background-secondary, #fafafa)',
    color: 'var(--color-text-primary, #111)',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    lineHeight: 1.6,
    fontFamily: 'inherit',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
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
    padding: '9px 20px',
    background: '#7F77DD',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
}