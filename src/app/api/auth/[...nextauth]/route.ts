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
                try {
                    console.log("[NextAuth] Authorizing credentials...");
                    const res = await fetch("https://gallery-eye-h4k3r.onrender.com/auth/login", {
                        method: 'POST',
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" }
                    })

                    console.log(`[NextAuth] Backend response status: ${res.status}`);

                    if (res.ok) {
                        const user = await res.json()
                        console.log("[NextAuth] User received:", user);
                        if (user) return user
                    } else {
                        const text = await res.text();
                        console.error(`[NextAuth] Backend error: ${text}`);
                    }
                } catch (e) {
                    console.error("[NextAuth] Authorization error:", e);
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
                        console.log("[NextAuth] Syncing Google user to backend...");
                        const res = await fetch("https://gallery-eye-h4k3r.onrender.com/auth/login", {
                            method: 'POST',
                            body: JSON.stringify({
                                email: user.email,
                                name: user.name,
                            }),
                            headers: { "Content-Type": "application/json" }
                        });

                        console.log(`[NextAuth] Backend response status: ${res.status}`);

                        if (res.ok) {
                            const backendUser = await res.json();
                            console.log("[NextAuth] Backend user received:", backendUser);
                            if (backendUser && backendUser.uuid) {
                                token.uuid = backendUser.uuid;
                                token.id = backendUser.id;
                            }
                        } else {
                            const text = await res.text();
                            console.error(`[NextAuth] Backend error: ${text}`);
                        }
                    } catch (e) {
                        console.error("Failed to sync google user", e);
                    }
                } else {
                    token.id = user.id
                    token.uuid = user.uuid
                }
            }
            return token
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id
                session.user.uuid = token.uuid
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
