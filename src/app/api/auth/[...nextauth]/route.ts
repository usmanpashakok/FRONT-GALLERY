import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
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
            async authorize(credentials, req) {
                // Add logic here to look up the user from the credentials supplied
                const res = await fetch("https://gallery-eye-h4k3r.onrender.com/auth/login", {
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
        async jwt({ token, user, account }: any) {
            if (user) {
                if (account?.provider === "google") {
                    try {
                        const res = await fetch("https://gallery-eye-h4k3r.onrender.com/auth/login", {
                            method: 'POST',
                            body: JSON.stringify({
                                email: user.email,
                                name: user.name,
                            }),
                            headers: { "Content-Type": "application/json" }
                        });
                        const backendUser = await res.json();
                        if (backendUser && backendUser.uuid) {
                            token.uuid = backendUser.uuid;
                            token.id = backendUser.id;
                            token.accessToken = backendUser.token;
                        }
                    } catch (e) {
                        console.error("Failed to sync google user", e);
                    }
                } else {
                    token.id = user.id
                    token.uuid = user.uuid
                    token.accessToken = user.token
                }
            }
            return token
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id
                session.user.uuid = token.uuid
                session.accessToken = token.accessToken
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

