import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        user: {
            id: string
            uuid: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        uuid: string
        token?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        uuid: string
        accessToken?: string
    }
}
