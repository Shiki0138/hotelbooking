# NextAuth統一認証システム設計書

## 作成者: worker3
## 作成日: 2025-06-23
## 優先度: 【第3優先】

---

## エグゼクティブサマリー

本設計書は、Hotel Booking Systemにおける認証システムをNextAuthに一本化するための包括的な計画を提示します。現在、システムには2つの異なる認証実装（バックエンドのJWT認証とフロントエンドのNextAuth/カスタムJWT併用）が存在し、これを統一することで、セキュリティ、保守性、開発効率を大幅に向上させます。

---

## 1. 現状分析

### 1.1 現在の認証システム構成

#### Backend (Express + JWT)
- **技術**: jsonwebtoken, bcrypt
- **認証方式**: Bearer JWT トークン
- **エンドポイント**: `/api/auth/register`, `/api/auth/login`
- **セッション期間**: 7日間（環境変数で設定可能）
- **ユーザーモデル**: Prismaスキーマで定義

#### Frontend (NextAuth + カスタムJWT)
- **技術**: NextAuth v4, jose, bcrypt
- **認証方式**: 
  - NextAuth: OAuth (Google, Apple)
  - カスタム: JWT (access/refresh tokens)
- **セッション期間**: 30日間（NextAuth）、15分/7日（カスタムJWT）
- **問題点**: 2つの認証システムが並存

### 1.2 統合の必要性

1. **セキュリティリスク**: 異なる認証システムの併存による脆弱性
2. **開発効率**: 重複したコードとメンテナンスコスト
3. **ユーザー体験**: 一貫性のない認証フロー
4. **拡張性**: 新機能追加時の複雑性

---

## 2. NextAuth統一設計

### 2.1 アーキテクチャ概要

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   NextAuth      │────▶│   Backend API   │
│  (Next.js)      │     │   Server        │     │   (Express)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                        統一認証フロー
```

### 2.2 NextAuth設定

#### 2.2.1 プロバイダー設定
```typescript
// /src/lib/auth.config.ts
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import LineProvider from "next-auth/providers/line"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
    // Credentials Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("メールアドレスとパスワードを入力してください")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !await bcrypt.compare(credentials.password, user.password)) {
          throw new Error("認証情報が正しくありません")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || "user"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role || "user"
      }
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // OAuthログイン時のユーザー作成/更新
      if (account?.provider && account.provider !== "credentials") {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image,
            lastLogin: new Date()
          },
          create: {
            email: user.email!,
            name: user.name!,
            image: user.image,
            provider: account.provider,
            password: "", // OAuthユーザーはパスワード不要
          }
        })
      }
      return true
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/welcome"
  },
  debug: process.env.NODE_ENV === "development",
}
```

### 2.3 Backend API統合

#### 2.3.1 NextAuthトークン検証ミドルウェア
```typescript
// /backend/src/middleware/nextauth.ts
import { getToken } from "next-auth/jwt"
import { NextApiRequest } from "next"
import { Request, Response, NextFunction } from "express"

export async function authenticateNextAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // NextAuthのJWTトークンを検証
    const token = await getToken({
      req: req as unknown as NextApiRequest,
      secret: process.env.NEXTAUTH_SECRET!
    })

    if (!token) {
      return res.status(401).json({ error: "認証が必要です" })
    }

    // ユーザー情報をリクエストに追加
    req.user = {
      id: token.id as string,
      email: token.email as string,
      role: token.role as string
    }

    next()
  } catch (error) {
    res.status(401).json({ error: "無効なトークンです" })
  }
}

// 管理者権限チェック
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "管理者権限が必要です" })
  }
  next()
}
```

### 2.4 統一ミドルウェア設定

```typescript
// /src/middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === "admin"
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

    // 管理者ルートへのアクセス制御
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // セキュリティヘッダー追加
    const response = NextResponse.next()
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    "/booking/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/api/bookings/:path*",
    "/api/user/:path*",
    "/api/admin/:path*"
  ]
}
```

### 2.5 セッション管理戦略

#### 2.5.1 セッション設定
- **セッション期間**: 30日間（長期記憶）
- **トークンローテーション**: 7日ごとに自動更新
- **デバイス管理**: 複数デバイスのセッション追跡
- **セキュアクッキー**: httpOnly, secure, sameSite設定

#### 2.5.2 セッション拡張機能
```typescript
// /src/lib/session-manager.ts
export class SessionManager {
  // アクティブセッション一覧取得
  static async getActiveSessions(userId: string) {
    return await prisma.session.findMany({
      where: { 
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    })
  }

  // セッション無効化
  static async revokeSession(sessionId: string) {
    return await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() }
    })
  }

  // 全セッション無効化
  static async revokeAllSessions(userId: string) {
    return await prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date() }
    })
  }
}
```

---

## 3. 実装計画

### 3.1 フェーズ1: 基盤整備（1週間）
- [ ] NextAuth設定ファイルの作成
- [ ] Prismaスキーマの更新（NextAuth対応）
- [ ] 環境変数の設定
- [ ] 基本的な認証フローのテスト

### 3.2 フェーズ2: Backend統合（1週間）
- [ ] NextAuthトークン検証ミドルウェアの実装
- [ ] 既存のJWT認証からの移行
- [ ] APIエンドポイントの更新
- [ ] テストケースの作成

### 3.3 フェーズ3: Frontend統合（1週間）
- [ ] カスタムJWT実装の削除
- [ ] useAuth hookのNextAuth対応
- [ ] 認証UIコンポーネントの更新
- [ ] セッション管理UIの実装

### 3.4 フェーズ4: 高度な機能（1週間）
- [ ] 2要素認証の実装
- [ ] マジックリンク認証
- [ ] セッション管理機能
- [ ] 監査ログ機能

---

## 4. 移行戦略

### 4.1 既存ユーザーの移行
```sql
-- 既存ユーザーデータの移行スクリプト
UPDATE users 
SET provider = 'credentials' 
WHERE provider IS NULL;

-- NextAuth必須フィールドの追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS emailVerified TIMESTAMP,
ADD COLUMN IF NOT EXISTS image TEXT;
```

### 4.2 段階的ロールアウト
1. **開発環境**: 完全切り替え
2. **ステージング**: A/Bテスト実施
3. **本番環境**: 10% → 50% → 100%

---

## 5. セキュリティ考慮事項

### 5.1 必須環境変数
```env
# NextAuth設定
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-min-32-chars
DATABASE_URL=postgresql://...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_ID=...
APPLE_SECRET=...
LINE_CLIENT_ID=...
LINE_CLIENT_SECRET=...

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=2592000
```

### 5.2 セキュリティベストプラクティス
- CSRF保護の有効化
- レート制限の実装
- セキュアヘッダーの設定
- 監査ログの実装
- 定期的なセキュリティ監査

---

## 6. 成功指標

- **認証成功率**: 99.9%以上
- **平均認証時間**: 200ms以下
- **セッション管理エラー**: 0.1%以下
- **ユーザー満足度**: 4.5/5.0以上

---

## 結論

NextAuthへの統一により、セキュアで拡張性の高い認証システムを実現します。段階的な移行により、リスクを最小化しながら、ユーザー体験を大幅に向上させることができます。

作成者: worker3
承認待ち: boss1