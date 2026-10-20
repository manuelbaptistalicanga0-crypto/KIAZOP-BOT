import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * A fronteira de segurança multi-tenant: nunca aceite tenantId do browser.
 * Obtém-no da sessão assinada e falha fechado se a sessão não existir.
 */
export async function getTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new TenantAuthError();
  return tenantId;
}

export class TenantAuthError extends Error {
  readonly status = 401;
  constructor() {
    super("Autenticação necessária.");
    this.name = "TenantAuthError";
  }
}

export function apiError(error: unknown): Response {
  if (error instanceof TenantAuthError) return Response.json({ error: error.message }, { status: 401 });
  console.error("Erro interno da API", error);
  return Response.json({ error: "Ocorreu um erro. Tenta novamente." }, { status: 500 });
}
