import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Email Login",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "your@email.com" },
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;

                // For now, we allow any email. 
                // We'll map roles in the session callback based on this email.
                return {
                    id: credentials.email,
                    email: credentials.email,
                    name: credentials.email.split('@')[0],
                };
            }
        }),
    ],
    pages: {
        signIn: '/auth/signin', // We'll create this or use default
    },
    callbacks: {
        async session({ session, token }) {
            // Map roles based on email from our data
            const email = token.email || "";
            let role = "STRATEGIST"; // Default

            // Basic role logic (can be expanded)
            if (email.includes('admin') || email.includes('manager')) role = "ADMIN";

            return {
                ...session,
                user: {
                    ...session.user,
                    role: role,
                }
            };
        },
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
            }
            return token;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
