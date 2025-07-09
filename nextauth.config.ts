import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import LineProvider from "next-auth/providers/line"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    // Credentials Provider for email/password
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "メールアドレス", 
          type: "email",
          placeholder: "email@example.com"
        },
        password: { 
          label: "パスワード", 
          type: "password",
          placeholder: "••••••••"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("メールアドレスとパスワードを入力してください")
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              emailVerified: true,
              image: true
            }
          })

          if (!user) {
            throw new Error("アカウントが見つかりません")
          }

          // OAuthユーザーの場合はパスワード認証を拒否
          if (!user.password || user.password === "") {
            throw new Error("このアカウントはソーシャルログインで作成されています")
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error("パスワードが正しくありません")
          }

          // 最終ログイン時刻を更新
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "user",
            image: user.image,
            emailVerified: user.emailVerified
          }
        } catch (error) {
          console.error("Authorization error:", error)
          throw error
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日間
    updateAge: 24 * 60 * 60, // 24時間ごとに更新
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // 初回ログイン時
      if (user) {
        token.id = user.id
        token.role = user.role || "user"
        token.emailVerified = user.emailVerified
      }

      // プロバイダー情報を保存
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }

      // セッション更新時
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.emailVerified = token.emailVerified as Date | null
        session.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // OAuth プロバイダーでのログイン時の処理
      if (account?.provider && account.provider !== "credentials") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser) {
            // 既存ユーザーの情報を更新
            await prisma.user.update({
              where: { email: user.email! },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                lastLogin: new Date(),
                provider: account.provider,
                emailVerified: new Date()
              }
            })
          } else {
            // 新規ユーザーを作成
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || "ゲストユーザー",
                image: user.image,
                provider: account.provider,
                password: "", // OAuthユーザーはパスワード不要
                emailVerified: new Date(),
                role: "user"
              }
            })
          }
        } catch (error) {
          console.error("Sign in error:", error)
          return false
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      // 相対URLの場合
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // 同じオリジンの場合
      else if (new URL(url).origin === baseUrl) {
        return url
      }
      // それ以外はベースURLにリダイレクト
      return baseUrl
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/logout", 
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/welcome"
  },
  events: {
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`)
    },
    async signOut({ token }) {
      console.log(`User ${token.email} signed out`)
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`)
    },
    async linkAccount({ user, account }) {
      console.log(`Account ${account.provider} linked to user ${user.email}`)
    }
  },
  debug: process.env.NODE_ENV === "development",
}

// 型定義の拡張
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      emailVerified: Date | null
    }
    provider?: string
  }

  interface User {
    role?: string
    emailVerified?: Date | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    provider?: string
    providerAccountId?: string
    emailVerified?: Date | null
  }
}