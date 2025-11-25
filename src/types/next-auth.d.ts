import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            uuid: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        uuid: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        uuid: string
    }
}
