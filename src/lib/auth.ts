import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

const providers: NextAuthOptions["providers"] = [CredentialsProvider({
  name: "Email e palavra-passe",
  credentials: { email: { label: "Email", type: "email" }, password: { label: "Palavra-passe", type: "password" } },
  async authorize(rawCredentials) {
    const parsed = credentialsSchema.safeParse(rawCredentials);
    if (!parsed.success || !process.env.DATABASE_URL) return null;
    const user = await getPrisma().user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true, tenantId: true },
    });
    if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
    return { id: user.id, name: user.name, email: user.email, tenantId: user.tenantId };
  },
})];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: { params: { prompt: "select_account" } },
  }));
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.trim().toLowerCase();
      const verifiedProfile = profile as { email_verified?: boolean } | undefined;
      if (!email || verifiedProfile?.email_verified !== true || !process.env.DATABASE_URL) return false;

      try {
        const displayName = (user.name?.trim() || email.split("@")[0]).slice(0, 100);
        const member = await getPrisma().user.upsert({
          where: { email },
          update: {},
          create: {
            name: displayName,
            email,
            passwordHash: null,
            tenant: { create: { name: `Empresa de ${displayName}` } },
          },
          select: { id: true, tenantId: true },
        });
        // NextAuth's Google subject is not the app's user ID. Carry our own tenant identity into the JWT.
        Object.assign(user, { id: member.id, tenantId: member.tenantId, email });
        return true;
      } catch (error) {
        console.error("Falha ao preparar conta Google", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const member = await getPrisma().user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, tenantId: true },
        });
        if (member) {
          token.sub = member.id;
          token.tenantId = member.tenantId;
        }
      } else if (user && typeof user.tenantId === "string") {
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.sub === "string" && typeof token.tenantId === "string") {
        session.user.id = token.sub;
        session.user.tenantId = token.tenantId;
      }
      return session;
    },
  },
};
