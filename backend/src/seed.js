const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ROOT_EMAIL
  const password = process.env.ROOT_PASSWORD
  const name = process.env.ROOT_NAME || 'Admin'

  if (!email || !password) {
    console.error('❌ Додай ROOT_EMAIL і ROOT_PASSWORD у .env')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
        where: { email },
        data: { role: 'ROOT', password: hashed }
    })
    console.log(`✅ Користувач ${email} отримав роль ROOT і новий пароль`)
    return
 }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, password: hashed, name, role: 'ROOT' }
  })
  console.log(`✅ ROOT користувача ${email} створено`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())