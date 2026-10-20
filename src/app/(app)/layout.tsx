import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AppNav } from "@/components/app-nav";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { PLAN_LABELS, type PlanTier } from "@/lib/plans";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");
  const tenant = await getPrisma().tenant.findUnique({ where: { id: session.user.tenantId }, select: { name: true, plan: true } });
  if (!tenant) redirect("/login");
  return <div className="workspace"><AppNav company={tenant.name} name={session.user.name || session.user.email || "Conta"} plan={PLAN_LABELS[tenant.plan as PlanTier]} /><main className="main-content">{children}</main></div>;
}
