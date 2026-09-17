// =============================================================================
// Le Fiduciaire — Audit Log Helper (Phase 8)
// Centralised audit logging for sensitive actions
// =============================================================================

import prisma from "./prisma.js";

// ---------------------------------------------------------------------------
// Actions sensibles répertoriées
// ---------------------------------------------------------------------------
export const AUDIT_ACTIONS = {
  PERIOD_CLOSE: "PERIOD_CLOSE",
  PERIOD_VALIDATE: "PERIOD_VALIDATE",
  CNSS_GENERATE: "CNSS_GENERATE",
  CNSS_ARCHIVE: "CNSS_ARCHIVE",
  COMPLEMENTARY_CREATE: "COMPLEMENTARY_CREATE",
  COMPLEMENTARY_CALCULATE: "COMPLEMENTARY_CALCULATE",
  RAPPORT_GROUPE_GENERATE: "RAPPORT_GROUPE_GENERATE",
} as const;

// ---------------------------------------------------------------------------
// Log an audit entry
// ---------------------------------------------------------------------------
export async function auditLog(params: {
  workspaceId: string | null; // null = événement d'authentification (LOGIN, LOGOUT…)
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    // Audit log failure should never break the main operation
    console.error("[audit] Failed to log:", err);
  }
}
