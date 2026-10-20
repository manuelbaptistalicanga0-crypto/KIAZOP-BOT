import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/components/auth-form";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };
export default async function LoginPage() {
  if ((await getServerSession(authOptions))?.user?.tenantId) redirect("/dashboard");
  return <main className="auth-page"><AuthForm mode="login" databaseConfigured={Boolean(process.env.DATABASE_URL)} googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} /><p className="auth-copyright">ExecutaPro · Feito para o trabalho acontecer.</p></main>;
}
