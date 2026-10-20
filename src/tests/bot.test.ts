import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  sendText: vi.fn(),
  eventClaim: vi.fn(), eventFind: vi.fn(), eventUpdate: vi.fn(),
  configFind: vi.fn(), employeeFind: vi.fn(), taskFind: vi.fn(), taskUpdateMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppText: mocks.sendText }));

import { processWebhookEvent } from "@/lib/bot";

const task = { id: "task-1", title: "Fechar caixa" };
const messagePayload = (text: string) => ({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.1", from: "244923000000", timestamp: "1730000000", type: "text", text: { body: text } }] } }] }] });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eventClaim.mockResolvedValue({ count: 1 });
  mocks.eventFind.mockResolvedValue({ id: "event-1", tenantId: "tenant-a", payload: messagePayload("FEITO"), attempts: 0 });
  mocks.eventUpdate.mockResolvedValue({});
  mocks.configFind.mockResolvedValue({ tenantId: "tenant-a", phoneNumberId: "98765", encryptedAccessToken: "encrypted", enabled: true });
  mocks.employeeFind.mockResolvedValue({ id: "employee-1", name: "Ana", phone: "244923000000" });
  mocks.taskFind.mockResolvedValue(task);
  mocks.taskUpdateMany.mockResolvedValue({ count: 1 });
  mocks.sendText.mockResolvedValue(undefined);
  mocks.getPrisma.mockReturnValue({
    webhookEvent: { updateMany: mocks.eventClaim, findUnique: mocks.eventFind, update: mocks.eventUpdate },
    whatsAppConfig: { findUnique: mocks.configFind },
    employee: { findFirst: mocks.employeeFind },
    task: { findFirst: mocks.taskFind, updateMany: mocks.taskUpdateMany },
  });
});

describe("WhatsApp task bot", () => {
  it("marks only a task belonging to the same tenant and employee as complete for FEITO", async () => {
    mocks.eventFind.mockResolvedValue({ id: "event-1", tenantId: "tenant-a", payload: messagePayload("FEITO"), attempts: 0 });
    mocks.taskFind.mockResolvedValueOnce(null).mockResolvedValueOnce(task);
    await processWebhookEvent("event-1");
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "task-1", tenantId: "tenant-a", employeeId: "employee-1" }),
      data: expect.objectContaining({ status: "COMPLETED" }),
    }));
    expect(mocks.sendText).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tenantId: "tenant-a" }), "244923000000", expect.stringContaining("Concluído"));
    expect(mocks.eventUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PROCESSED" }) }));
  });

  it("asks for the reason when the employee replies ATRASO", async () => {
    mocks.eventFind.mockResolvedValue({ id: "event-1", tenantId: "tenant-a", payload: messagePayload("ATRASO"), attempts: 0 });
    mocks.taskFind.mockResolvedValueOnce(null).mockResolvedValueOnce(task);
    await processWebhookEvent("event-1");
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "AWAITING_DELAY_REASON" } }));
    expect(mocks.sendText).toHaveBeenCalledWith(expect.anything(), expect.anything(), "244923000000", expect.stringContaining("Qual é o motivo"));
  });

  it("stores the employee's next reply as the delay reason", async () => {
    mocks.eventFind.mockResolvedValue({ id: "event-1", tenantId: "tenant-a", payload: messagePayload("A viatura avariou"), attempts: 0 });
    mocks.taskFind.mockResolvedValueOnce(task);
    await processWebhookEvent("event-1");
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: "tenant-a", status: "AWAITING_DELAY_REASON" }),
      data: expect.objectContaining({ status: "DELAYED", delayReason: "A viatura avariou" }),
    }));
    expect(mocks.sendText).toHaveBeenCalledWith(expect.anything(), expect.anything(), "244923000000", expect.stringContaining("Registei o motivo"));
  });
});
