-- ExecutaPro: modelo inicial multi-tenant. Todas as relações pertencem a uma empresa.
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AWAITING_DELAY_REASON', 'DELAYED', 'COMPLETED');
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "delayReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "reminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WhatsAppConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "wabaId" TEXT NOT NULL,
  "encryptedAccessToken" TEXT NOT NULL,
  "verifyTokenHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MessageLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "direction" "MessageDirection" NOT NULL,
  "status" "MessageStatus" NOT NULL,
  "to" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_tenantId_createdAt_idx" ON "User"("tenantId", "createdAt");
CREATE UNIQUE INDEX "Employee_id_tenantId_key" ON "Employee"("id", "tenantId");
CREATE UNIQUE INDEX "Employee_tenantId_phone_key" ON "Employee"("tenantId", "phone");
CREATE INDEX "Employee_tenantId_name_idx" ON "Employee"("tenantId", "name");
CREATE INDEX "Task_tenantId_dueAt_status_idx" ON "Task"("tenantId", "dueAt", "status");
CREATE INDEX "Task_tenantId_status_dueAt_idx" ON "Task"("tenantId", "status", "dueAt");
CREATE INDEX "Task_tenantId_employeeId_status_dueAt_idx" ON "Task"("tenantId", "employeeId", "status", "dueAt");
CREATE INDEX "Task_tenantId_reminderSentAt_dueAt_idx" ON "Task"("tenantId", "reminderSentAt", "dueAt");
CREATE UNIQUE INDEX "WhatsAppConfig_tenantId_key" ON "WhatsAppConfig"("tenantId");
CREATE UNIQUE INDEX "WhatsAppConfig_phoneNumberId_key" ON "WhatsAppConfig"("phoneNumberId");
CREATE INDEX "WhatsAppConfig_verifyTokenHash_idx" ON "WhatsAppConfig"("verifyTokenHash");
CREATE UNIQUE INDEX "WebhookEvent_tenantId_providerEventId_key" ON "WebhookEvent"("tenantId", "providerEventId");
CREATE INDEX "WebhookEvent_tenantId_status_createdAt_idx" ON "WebhookEvent"("tenantId", "status", "createdAt");
CREATE INDEX "MessageLog_tenantId_createdAt_status_idx" ON "MessageLog"("tenantId", "createdAt", "status");

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_employeeId_tenantId_fkey" FOREIGN KEY ("employeeId", "tenantId") REFERENCES "Employee"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConfig" ADD CONSTRAINT "WhatsAppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
