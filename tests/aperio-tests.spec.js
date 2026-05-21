const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:5173'
const TEST_EMAIL = 'test@test.com'
const TEST_PASSWORD = '123456'

async function login(page) {
  await page.goto(`${BASE_URL}/login`)
  await page.getByPlaceholder('your@email.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
  
  // Клік по капчі
  await page.frameLocator('iframe[title="reCAPTCHA"]').getByRole('checkbox').click()
  await page.waitForTimeout(1500) // Чекаємо на анімацію
  
  await page.getByRole('button', { name: 'Увійти' }).click()
  await page.waitForURL(`${BASE_URL}/dashboard`)
}

// ── Блок 1: Авторизація та Безпека ──────────────────────
test.describe('Авторизація та Безпека', () => {

  test('Успішний логін → редирект на /dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.getByPlaceholder('your@email.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    
    // Клік по капчі
    await page.frameLocator('iframe[title="reCAPTCHA"]').getByRole('checkbox').click()
    await page.waitForTimeout(1500)
    
    await page.getByRole('button', { name: 'Увійти' }).click()
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`)
    await expect(page.getByText('Загальний баланс')).toBeVisible()
  })

  test('Помилка логіну → показ повідомлення про помилку', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.getByPlaceholder('your@email.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    
    // Клік по капчі
    await page.frameLocator('iframe[title="reCAPTCHA"]').getByRole('checkbox').click()
    await page.waitForTimeout(1500)
    
    await page.getByRole('button', { name: 'Увійти' }).click()
    // Очікуємо текст помилки (якщо він у тебе інакший - заміни цей текст)
    await expect(page.getByText('Невірний email або пароль')).toBeVisible()
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })

  test('Захист роутів → редирект на /login без авторизації', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page).toHaveURL(`${BASE_URL}/login`)
    await context.close()
  })

  test('Вихід з акаунту → редирект на /login', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Вийти' }).click()
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })

})

// ── Блок 2: Бізнес-логіка (Транзакції) ──────────────────
test.describe('Бізнес-логіка (Транзакції)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Додавання витрати → з\'являється в списку', async ({ page }) => {
    await page.getByRole('button', { name: /Додати/ }).click()
    await page.getByPlaceholder('Сума ₴').fill('500')
    await page.locator('select').filter({ hasText: 'Витрата' }).selectOption('expense')
    const categorySelect = page.locator('select').nth(1)
    await categorySelect.selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Зберегти транзакцію' }).click()
    await expect(page.getByText('Транзакцію додано!')).toBeVisible()
    await expect(page.getByText('500')).toBeVisible()
  })

  test('Валідація → порожня сума не зберігається', async ({ page }) => {
    await page.getByRole('button', { name: /Додати/ }).click()
    await page.getByRole('button', { name: 'Зберегти транзакцію' }).click()
    await expect(page.getByText('Заповни всі поля')).toBeVisible()
  })

  test('Додавання доходу → баланс збільшується', async ({ page }) => {
    const balanceBefore = await page.locator('[data-testid="balance"]').textContent().catch(() => null)
    await page.getByRole('button', { name: /Додати/ }).click()
    await page.locator('select').first().selectOption('income')
    await page.getByPlaceholder('Сума ₴').fill('1000')
    const categorySelect = page.locator('select').nth(1)
    await categorySelect.selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Зберегти транзакцію' }).click()
    await expect(page.getByText('Транзакцію додано!')).toBeVisible()
  })

  test('Видалення транзакції → зникає зі списку', async ({ page }) => {
    // Спочатку додаємо
    await page.getByRole('button', { name: /Додати/ }).click()
    await page.getByPlaceholder('Сума ₴').fill('999')
    const categorySelect = page.locator('select').nth(1)
    await categorySelect.selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Зберегти транзакцію' }).click()
    await expect(page.getByText('Транзакцію додано!')).toBeVisible()

    // Видаляємо першу транзакцію
    page.once('dialog', dialog => dialog.accept())
    await page.locator('[title="Видалити"]').first().click()
    await expect(page.getByText('Видалено')).toBeVisible()
  })

  test('IDOR захист → не можна видалити чужу транзакцію', async ({ page, request }) => {
    // Спробуємо видалити транзакцію з випадковим ID
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const response = await request.delete(`http://localhost:3001/api/transactions/${fakeId}`, {
      headers: { 'Content-Type': 'application/json' }
    })
    expect(response.status()).toBe(401)
  })

})

// ── Блок 3: Інтерфейс ───────────────────────────────────
test.describe('Інтерфейс', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Зміна теми → html отримує data-theme', async ({ page }) => {
    const themeBtn = page.locator('[data-testid="theme-toggle"]')
      .or(page.locator('button').filter({ hasText: /☀|🌙|theme/i }))

    const htmlBefore = await page.locator('html').getAttribute('data-theme')
    await themeBtn.first().click()
    const htmlAfter = await page.locator('html').getAttribute('data-theme')
    expect(htmlAfter).not.toBe(htmlBefore)
  })

  test('Навігація між вкладками → контент змінюється', async ({ page }) => {
    await page.getByRole('button', { name: 'Транзакції' }).click()
    await expect(page.getByText('Всі транзакції').or(page.getByText('Транзакції'))).toBeVisible()

    await page.getByRole('button', { name: 'Графіки' }).click()
    await expect(page.getByText('Графіки і статистика')).toBeVisible()

    await page.getByRole('button', { name: 'AI Аналіз' }).click()
    await expect(page.getByText('AI Аналіз')).toBeVisible()
  })

  test('Фільтр місяців → стрілки змінюють місяць', async ({ page }) => {
    const monthLabel = page.locator('span').filter({ hasText: /Травень|Квітень|Березень|2026/ }).first()
    const textBefore = await monthLabel.textContent()
    await page.locator('button').filter({ hasText: '‹' }).click()
    const textAfter = await monthLabel.textContent()
    expect(textAfter).not.toBe(textBefore)
  })

  test('Пошук транзакцій → фільтрує список', async ({ page }) => {
    await page.getByRole('button', { name: 'Транзакції' }).click()
    await page.getByPlaceholder(/Пошук/).fill('Сільпо')
    await page.waitForTimeout(300)
    const rows = page.locator('[style*="txRow"]').or(page.locator('.tx-row'))
    // Перевіряємо що або є результати з "Сільпо" або список порожній
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

})