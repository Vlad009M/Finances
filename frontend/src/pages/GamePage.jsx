import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../api/index.js'
import { useIsMobile } from '../hooks/useResponsive.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function GamePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('hero')
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!user) return          
    if (hasFetched.current) return  і
    hasFetched.current = true
    loadGame()
  }, [user])

  const loadGame = async () => {
    try {
      const res = await api.get('/game')
      setData(res.data)
    } catch {
      toast.error('Помилка завантаження')
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>⚔️</div>
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Завантаження профілю героя...</div>
    </div>
  )

  if (!data) return null

  const { xp, level, streak, archetype, savingsRate, achievements, challenge } = data

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={s.pageTitle}>⚔️ Фінансовий Герой</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Твої фінансові звички перетворюються на пригоду
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...s.tabs, ...(isMobile && { width: '100%' }) }}>
        {[
          { id: 'hero',       label: '🦸 Герой' },
          { id: 'achievements', label: `🏆 Ачівки (${achievements.unlocked.length})` },
          { id: 'challenge',  label: '⚡ Челендж' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HERO TAB ── */}
      {tab === 'hero' && (
        <div style={{ ...s.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>

          {/* Картка героя */}
          <div style={s.heroCard}>
            <div style={s.heroTop}>
              <div style={s.heroAvatar}>{level.icon}</div>
              <div>
                <div style={s.heroLevel}>Рівень {level.level}</div>
                <div style={s.heroTitle}>{level.title}</div>
                {level.next && (
                  <div style={s.heroNext}>Наступний: {level.next.title} {level.next.icon}</div>
                )}
              </div>
            </div>

            {/* XP прогрес */}
            <div style={{ marginTop: 20 }}>
              <div style={s.xpRow}>
                <span style={s.xpLabel}>XP: {xp}</span>
                <span style={s.xpLabel}>
                  {level.next ? `${level.xpInLevel} / ${level.xpToNext}` : 'MAX'}
                </span>
              </div>
              <div style={s.xpBar}>
                <div style={{ ...s.xpFill, width: `${level.progress}%` }} />
              </div>
              {level.next && (
                <div style={s.xpHint}>
                  Ще {level.xpToNext - level.xpInLevel} XP до рівня {level.level + 1}
                </div>
              )}
            </div>

            {/* Streak */}
            <div style={s.streakRow}>
              <div style={s.streakIcon}>
                {streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥'}
              </div>
              <div>
                <div style={s.streakCount}>{streak} {streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів'} поспіль</div>
                <div style={s.streakDesc}>
                  {streak === 0 ? 'Додай транзакцію щоб почати серію' :
                   streak < 3 ? 'Гарний початок! Продовжуй' :
                   streak < 7 ? 'Відмінна серія! До тижня залишилось ' + (7 - streak) + ' д.' :
                   streak < 30 ? '🔥 Неймовірно! До місяця: ' + (30 - streak) + ' д.' :
                   '🏆 Легендарна серія!'}
                </div>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Архетип */}
            {archetype ? (
              <div style={{ ...s.card, borderColor: archetype.color, background: `${archetype.color}15` }}>
                <div style={s.cardLabel}>Твій фінансовий архетип</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ ...s.archetypeIcon, background: `${archetype.color}30` }}>
                    {archetype.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: archetype.color }}>{archetype.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{archetype.desc}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={s.card}>
                <div style={s.cardLabel}>Твій фінансовий архетип</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
                  🔍 Додай ще транзакцій щоб система визначила твій архетип
                </div>
              </div>
            )}

            {/* Місячні заощадження */}
            <div style={s.card}>
              <div style={s.cardLabel}>Заощадження цього місяця</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: savingsRate >= 20 ? '#43e97b' : savingsRate > 0 ? '#fee140' : '#fa709a' }}>
                  {savingsRate}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {savingsRate >= 50 ? '🏆 Феноменально! +200 XP бонус' :
                   savingsRate >= 20 ? '⭐ Чудово! +100 XP бонус' :
                   savingsRate > 0 ? '💪 Є куди рости. Ціль — 20%' :
                   '😬 Витрати перевищують доходи'}
                </div>
              </div>
              <div style={s.xpBar}>
                <div style={{ ...s.xpFill, width: `${Math.min(savingsRate, 100)}%`, background: savingsRate >= 20 ? '#43e97b' : '#fee140' }} />
              </div>
            </div>

            {/* Рівні - дорожня карта */}
            <div style={s.card}>
              <div style={s.cardLabel}>Дорожня карта рівнів</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(lvl => {
                  const LEVELS_DATA = [
                    { level: 1, title: 'Новачок', icon: '🌱', xpRequired: 0 },
                    { level: 2, title: 'Економ', icon: '💡', xpRequired: 100 },
                    { level: 3, title: 'Розважливий', icon: '🧠', xpRequired: 250 },
                    { level: 4, title: 'Планувальник', icon: '📋', xpRequired: 500 },
                    { level: 5, title: 'Стратег', icon: '♟️', xpRequired: 900 },
                    { level: 6, title: 'Фінансист', icon: '💼', xpRequired: 1400 },
                    { level: 7, title: 'Інвестор', icon: '📈', xpRequired: 2000 },
                    { level: 8, title: 'Мудрець грошей', icon: '🦉', xpRequired: 2800 },
                    { level: 9, title: 'Майстер бюджету', icon: '🏆', xpRequired: 3800 },
                    { level: 10, title: 'Фінансовий Гуру', icon: '👑', xpRequired: 5000 },
                  ]
                  const ld = LEVELS_DATA[lvl - 1]
                  const done = level.level > lvl
                  const current = level.level === lvl
                  return (
                    <div key={lvl} style={{ ...s.levelRow, opacity: done || current ? 1 : 0.4, background: current ? '#EEEDFE' : 'transparent' }}>
                      <span style={{ fontSize: 16 }}>{ld.icon}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: current ? 600 : 400, color: current ? '#534AB7' : 'var(--color-text-secondary)' }}>
                        {lvl}. {ld.title}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{ld.xpRequired} XP</span>
                      {done && <span style={{ color: '#43e97b', fontSize: 14 }}>✓</span>}
                      {current && <span style={{ color: '#534AB7', fontSize: 11, fontWeight: 600 }}>← ти тут</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS TAB ── */}
      {tab === 'achievements' && (
        <div>
          {achievements.unlocked.length > 0 && (
            <>
              <div style={s.sectionTitle}>🏆 Отримані ({achievements.unlocked.length})</div>
              <div style={s.achGrid}>
                {achievements.unlocked.map(a => (
                  <div key={a.code} style={{ ...s.achCard, ...s.achUnlocked }}>
                    <div style={s.achIcon}>{a.icon}</div>
                    <div style={s.achTitle}>{a.title}</div>
                    <div style={s.achDesc}>{a.desc}</div>
                    <div style={s.achXP}>+{a.xp} XP</div>
                    <div style={s.achDate}>{new Date(a.unlockedAt).toLocaleDateString('uk', { day: 'numeric', month: 'short' })}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {achievements.locked.length > 0 && (
            <>
              <div style={{ ...s.sectionTitle, marginTop: 24 }}>🔒 Заблоковані ({achievements.locked.length})</div>
              <div style={s.achGrid}>
                {achievements.locked.map(a => (
                  <div key={a.code} style={{ ...s.achCard, ...s.achLocked }}>
                    <div style={{ ...s.achIcon, filter: 'grayscale(1)', opacity: 0.5 }}>{a.icon}</div>
                    <div style={{ ...s.achTitle, color: 'var(--color-text-tertiary)' }}>{a.title}</div>
                    <div style={s.achDesc}>{a.desc}</div>
                    <div style={{ ...s.achXP, opacity: 0.5 }}>+{a.xp} XP</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHALLENGE TAB ── */}
      {tab === 'challenge' && (
        <div style={{ maxWidth: 520 }}>
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>⚡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Тижневий челендж</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Оновлюється щопонеділка</div>
              </div>
            </div>

            {challenge ? (
              <>
                <div style={{ ...s.challengeBox, borderColor: challenge.completed ? '#43e97b' : '#AFA9EC', background: challenge.completed ? '#f0fff4' : '#F5F4FE' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: challenge.completed ? '#3B6D11' : '#534AB7', marginBottom: 6 }}>
                    {challenge.completed ? '✅ Виконано!' : '🎯 Активний челендж'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                    {challenge.type === 'spend_less_food' && `Витрать на їжу менше ніж ${Math.round(challenge.targetAmount)}₴ цього тижня`}
                    {challenge.type === 'spend_less_fun' && `Витрать на розваги менше ніж ${Math.round(challenge.targetAmount)}₴ цього тижня`}
                    {challenge.type === 'add_transactions' && `Додавай хоча б одну транзакцію кожен день (ціль: ${Math.round(challenge.targetAmount)} записів)`}
                  </div>

                  {!challenge.completed && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                        <span>Прогрес</span>
                        <span>
                          {challenge.type === 'add_transactions'
                            ? `${Math.round(challenge.currentAmount)} / ${Math.round(challenge.targetAmount)} записів`
                            : `${Math.round(challenge.currentAmount)}₴ / ${Math.round(challenge.targetAmount)}₴`}
                        </span>
                      </div>
                      <div style={s.xpBar}>
                        <div style={{
                          ...s.xpFill,
                          width: challenge.type === 'add_transactions'
                            ? `${Math.min((challenge.currentAmount / challenge.targetAmount) * 100, 100)}%`
                            : `${Math.min((1 - challenge.currentAmount / challenge.targetAmount) * 100, 100)}%`,
                          background: '#534AB7'
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: '#534AB7' }}>
                    Нагорода: +{challenge.xpReward} XP 🎁
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  💡 Виконуй челенджі щотижня щоб отримувати бонусний XP і швидше підвищувати рівень
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                Додай транзакції щоб отримати перший челендж
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageTitle: { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' },
  tabs: { display: 'flex', gap: 4, background: 'var(--color-background-tertiary, #f4f5f7)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' },
  tab: { padding: '8px 16px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: 400, whiteSpace: 'nowrap' },
  tabActive: { background: 'var(--color-background-primary, #fff)', color: '#534AB7', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' },
  heroCard: { background: 'linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)', borderRadius: 16, padding: 24, color: '#fff' },
  heroTop: { display: 'flex', alignItems: 'center', gap: 16 },
  heroAvatar: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 },
  heroLevel: { fontSize: 12, opacity: 0.75, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: 600 },
  heroNext: { fontSize: 12, opacity: 0.65, marginTop: 4 },
  xpRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 6 },
  xpLabel: { },
  xpBar: { height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', background: '#fff', borderRadius: 4, transition: 'width 0.5s ease' },
  xpHint: { fontSize: 11, opacity: 0.65, marginTop: 4, textAlign: 'right' },
  streakRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px' },
  streakIcon: { fontSize: 28, flexShrink: 0 },
  streakCount: { fontSize: 15, fontWeight: 600 },
  streakDesc: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary, #e0e0e0)', borderRadius: 12, padding: 16 },
  cardLabel: { fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  archetypeIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  levelRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6 },
  sectionTitle: { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 14 },
  achGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  achCard: { borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 },
  achUnlocked: { background: 'var(--color-background-primary)', border: '0.5px solid #AFA9EC' },
  achLocked: { background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)' },
  achIcon: { fontSize: 32, marginBottom: 4 },
  achTitle: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' },
  achDesc: { fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 },
  achXP: { fontSize: 12, fontWeight: 600, color: '#534AB7', background: '#EEEDFE', padding: '2px 10px', borderRadius: 20 },
  achDate: { fontSize: 10, color: 'var(--color-text-tertiary)' },
  challengeBox: { border: '0.5px solid', borderRadius: 10, padding: '16px' },
}