import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    name: "Email e palavra-passe",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Palavra-passe", type: "password" } },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) return null;
      const user = await getPrisma().user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        select: { id: true, name: true, email: true, passwordHash: true, tenantId: true },
      });
      if (!user || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, tenantId: user.tenantId };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.tenantId = user.tenantId;
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
