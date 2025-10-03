import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Resetting users table...')
  await prisma.user.deleteMany({});

  // Hash password '123' for all roles
  const hashedPassword = await bcrypt.hash('123', 12);

  // Create test users with password '123'
  const testUsers = [
    {
      email: 'learner@test.com',
      name: 'Test Learner',
      role: UserRole.LEARNER,
      password: hashedPassword,
    },
    {
      email: 'volunteer@test.com',
      name: 'Test Volunteer',
      role: UserRole.VOLUNTEER,
      password: hashedPassword,
    },
    {
      email: 'admin@test.com',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      password: hashedPassword,
    }
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.create({
      data: userData,
    });
    console.log(`✅ Created user: ${user.email} (${user.role})`);
  }

  console.log('🎉 Database reset and seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })