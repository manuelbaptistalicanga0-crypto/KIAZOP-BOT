import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";
import { SetupWizard } from "@/components/setup-wizard";

export const metadata: Metadata = { title: "Ligar WhatsApp" };

export default async function SetupPage() {
  const tenantId = await getTenantId();
  const config = await getPrisma().whatsAppConfig.findUnique({ where: { tenantId }, select: { phoneNumberId: true, enabled: true, updatedAt: true } });
  return <div className="page-wrap setup-page"><SetupWizard configured={Boolean(config?.enabled)} phoneNumberId={config?.phoneNumberId} /></div>;
}
