import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { executeWithRLSBypass } from "@/lib/prisma"
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters"

/**
 * Custom NextAuth adapter that bypasses RLS for authentication operations
 * This wraps the PrismaAdapter and overrides key methods to use RLS bypass
 */
export function createRLSBypassAdapter(): Adapter {
  const baseAdapter = PrismaAdapter({} as any) // We'll override the methods anyway
  
  return {
    ...baseAdapter,
    
    async createUser(user: Omit<AdapterUser, "id">) {
      return executeWithRLSBypass(async (client) => {
        return client.user.create({
          data: {
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
          },
        })
      })
    },

    async getUser(id: string) {
      return executeWithRLSBypass(async (client) => {
        return client.user.findUnique({
          where: { id },
        })
      })
    },

    async getUserByEmail(email: string) {
      return executeWithRLSBypass(async (client) => {
        return client.user.findUnique({
          where: { email },
        })
      })
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      return executeWithRLSBypass(async (client) => {
        const account = await client.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          select: { user: true },
        })
        return account?.user ?? null
      })
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      return executeWithRLSBypass(async (client) => {
        const { id, ...data } = user
        return client.user.update({
          where: { id },
          data,
        })
      })
    },

    async deleteUser(userId: string) {
      return executeWithRLSBypass(async (client) => {
        return client.user.delete({
          where: { id: userId },
        })
      })
    },

    async linkAccount(account: AdapterAccount) {
      return executeWithRLSBypass(async (client) => {
        return client.account.create({
          data: {
            userId: account.userId,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
          },
        })
      })
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      return executeWithRLSBypass(async (client) => {
        return client.account.delete({
          where: { provider_providerAccountId: { provider, providerAccountId } },
        })
      })
    },

    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }) {
      return executeWithRLSBypass(async (client) => {
        return client.session.create({
          data: {
            sessionToken,
            userId,
            expires,
          },
        })
      })
    },

    async getSessionAndUser(sessionToken: string) {
      return executeWithRLSBypass(async (client) => {
        const userAndSession = await client.session.findUnique({
          where: { sessionToken },
          include: { user: true },
        })

        if (!userAndSession) return null

        const { user, ...session } = userAndSession
        return { user, session }
      })
    },

    async updateSession({ sessionToken, ...data }: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
      return executeWithRLSBypass(async (client) => {
        return client.session.update({
          where: { sessionToken },
          data,
        })
      })
    },

    async deleteSession(sessionToken: string) {
      return executeWithRLSBypass(async (client) => {
        return client.session.delete({
          where: { sessionToken },
        })
      })
    },

    async createVerificationToken({ identifier, expires, token }: VerificationToken) {
      return executeWithRLSBypass(async (client) => {
        return client.verificationToken.create({
          data: {
            identifier,
            token,
            expires,
          },
        })
      })
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      return executeWithRLSBypass(async (client) => {
        try {
          return await client.verificationToken.delete({
            where: { identifier_token: { identifier, token } },
          })
        } catch (error: any) {
          // If the token is not found, return null
          if (error?.code === 'P2025') return null
          throw error
        }
      })
    },
  }
}