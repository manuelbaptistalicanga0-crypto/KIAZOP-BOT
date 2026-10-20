export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export const PLAN_LIMITS: Record<PlanTier, { employees: number; activeTasks: number; monthlyMessages: number }> = {
  FREE: { employees: 5, activeTasks: 100, monthlyMessages: 500 },
  PRO: { employees: 50, activeTasks: 2_000, monthlyMessages: 20_000 },
  ENTERPRISE: { employees: Number.POSITIVE_INFINITY, activeTasks: Number.POSITIVE_INFINITY, monthlyMessages: Number.POSITIVE_INFINITY },
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  FREE: "Gratuito",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};
