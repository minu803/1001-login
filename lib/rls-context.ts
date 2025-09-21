import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export interface RLSUser {
  id: string
  role: string
}

export class RLSPrismaClient {
  private client: PrismaClient

  constructor() {
    this.client = new PrismaClient()
  }

  async withUserContext(user: RLSUser) {
    await this.setUserContext(user.id, user.role)
    return this.client
  }

  async withSessionContext() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      throw new Error('No valid session found for RLS context')
    }
    
    return this.withUserContext({
      id: session.user.id,
      role: session.user.role
    })
  }

  private async setUserContext(userId: string, userRole: string) {
    await this.client.$executeRaw`
      SELECT set_config('app.current_user_id', ${userId}, true)
    `
    await this.client.$executeRaw`
      SELECT set_config('app.current_user_role', ${userRole}, true)
    `
  }

  async clearUserContext() {
    await this.client.$executeRaw`
      SELECT set_config('app.current_user_id', '', true)
    `
    await this.client.$executeRaw`
      SELECT set_config('app.current_user_role', '', true)
    `
  }

  getClient() {
    return this.client
  }

  async disconnect() {
    await this.client.$disconnect()
  }
}

let rlsPrisma: RLSPrismaClient

if (process.env.NODE_ENV === 'production') {
  rlsPrisma = new RLSPrismaClient()
} else {
  const globalForRLSPrisma = global as unknown as { rlsPrisma: RLSPrismaClient }
  if (!globalForRLSPrisma.rlsPrisma) {
    globalForRLSPrisma.rlsPrisma = new RLSPrismaClient()
  }
  rlsPrisma = globalForRLSPrisma.rlsPrisma
}

export { rlsPrisma }

export async function createRLSPrismaClient(user?: RLSUser): Promise<PrismaClient> {
  if (user) {
    return await rlsPrisma.withUserContext(user)
  } else {
    return await rlsPrisma.withSessionContext()
  }
}

export async function executeWithRLS<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  user?: RLSUser
): Promise<T> {
  const prisma = await createRLSPrismaClient(user)
  try {
    return await operation(prisma)
  } finally {
    // Context is automatically cleared when the connection is returned to the pool
  }
}

export function isAdmin(role: string): boolean {
  return role === 'ADMIN'
}

export function isVolunteer(role: string): boolean {
  return role === 'VOLUNTEER'
}

export function canAccessVolunteerData(userRole: string, targetUserId: string, currentUserId: string): boolean {
  return isAdmin(userRole) || (isVolunteer(userRole) && targetUserId === currentUserId)
}