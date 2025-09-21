import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient
  systemPrisma: PrismaClient 
}

export const prisma = globalForPrisma.prisma || new PrismaClient()

// System Prisma client that bypasses RLS for authentication operations
// For now, we'll use transactions with explicit RLS bypass
export const systemPrisma = globalForPrisma.systemPrisma || new PrismaClient()

// Helper function to execute operations with RLS bypass
export async function executeWithRLSBypass<T>(operation: (client: any) => Promise<T>): Promise<T> {
  return systemPrisma.$transaction(async (tx) => {
    // Set SYSTEM context and disable RLS for authentication operations
    try {
      await tx.$executeRaw`SELECT set_config('app.current_user_role', 'SYSTEM', true)`
      await tx.$executeRaw`SELECT set_config('app.current_user_id', 'system', true)`
      // Bypass RLS for this transaction (stories_user has bypass privileges)
      await tx.$executeRaw`SET LOCAL row_security = off`
    } catch (error: any) {
      console.log('RLS bypass setup failed:', error.message)
    }
    
    return operation(tx)
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.systemPrisma = systemPrisma
}

export default prisma