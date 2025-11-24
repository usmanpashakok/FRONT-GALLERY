import NextAuth, { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

declare module "next-auth" {
    interface Session {
        user: {
            id?: string
            uuid?: string
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }
    interface User {
        id: string
        uuid: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string
        uuid?: string
    }
}

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Add logic here to look up the user from the credentials supplied
                const res = await fetch("https://h4k3r-gallery-eye.onrender.com/auth/login", {
                    method: 'POST',
                    body: JSON.stringify(credentials),
                    headers: { "Content-Type": "application/json" }
                })
                const user = await res.json()

                if (res.ok && user) {
                    return user
                }
                return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.uuid = user.uuid
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.uuid = token.uuid as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
