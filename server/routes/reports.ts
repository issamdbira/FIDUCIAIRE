// =============================================================================
// Le Fiduciaire — Routes Rapports Groupés (Phase 8)
// POST /api/reports/periods/:id/grouped-pdf — Générer PDF groupé d'une période
// GET  /api/reports/:ws                    — Lister rapports générés
// GET  /api/reports/:ws/:id                — Détail rapport
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { generateBulletinHtml, storeFile, fileExists } from "../lib/document-generator.js";
import { auditLog, AUDIT_ACTIONS } from "../lib/audit-log.js";

const router = Router();

async function checkWs(userId: string, role: string, ws: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const m = await prisma.workspace_members.findUnique({ where: { userId_workspaceId: { userId, workspaceId: ws } } });
  return !!m;
}

// ---------------------------------------------------------------------------
// POST /api/reports/periods/:id/grouped-pdf — Générer rapport groupé
// ---------------------------------------------------------------------------
router.post("/periods/:id/grouped-pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: { client_company: true },
    });
    if (!period || period.workspaceId !== workspaceId) return res.status(404).json({ error: "Période introuvable" });

    const payslips = await prisma.payslip.findMany({
      where: { periodId: id, workspaceId },
      orderBy: { nomPrenom: "asc" },
    });
    if (!payslips.length) return res.status(400).json({ error: "Aucun bulletin dans cette période" });

    // Vérifier si rapport déjà généré
    const existing = await prisma.documentStorage.findFirst({
      where: { periodePaieId: id, type: "RAPPORT_GROUPE", workspaceId },
    });
    if (existing && fileExists(existing.cheminStockage)) {
      return res.json({ document: existing, message: "Rapport groupé déjà généré" });
    }

    const clientInfo = {
      raisonSociale: period.client_company.raisonSociale,
      matriculeFiscal: period.client_company.matriculeFiscal,
      matriculeCnss: period.client_company.matriculeCnss,
    };

    const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const realMois = period.mois > 12 ? period.mois - 100 : period.mois;
    const periodeLabel = `${moisNoms[realMois - 1]} ${period.annee}`;

    let groupedHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Groupé — ${clientInfo.raisonSociale} — ${periodeLabel}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e3a5f; }
  h1 { color: #1e3a5f; border-bottom: 3px solid #c9a84c; padding-bottom: 8px; }
  .bulletin { page-break-after: always; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #c9a84c; }
  .bulletin:last-child { page-break-after: auto; border-bottom: none; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { padding: 4px 8px; border: 1px solid #ddd; text-align: left; }
  th { background: #1e3a5f; color: white; }
  .right { text-align: right; }
  .net-row td { font-weight: bold; background: #c9a84c22; font-size: 1.05em; }
  .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
  .footer { margin-top: 15px; font-size: 0.8em; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head>
<body>
<h1>RAPPORT GROUPÉ — ${periodeLabel}</h1>
<p><strong>Employeur :</strong> ${clientInfo.raisonSociale}${clientInfo.matriculeCnss ? ` — <strong>Mat. CNSS :</strong> ${clientInfo.matriculeCnss}` : ''}</p>
<p><strong>Nombre de bulletins :</strong> ${payslips.length}</p>
<hr>`;

    for (const ps of payslips) {
      const html = generateBulletinHtml(ps as any, clientInfo);
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : html;
      groupedHtml += `<div class="bulletin">${bodyContent}</div>`;
    }

    groupedHtml += `
<div class="footer">
  Rapport groupé généré par Le Fiduciaire — ${new Date().toISOString().slice(0, 10)}<br>
  ${payslips.length} bulletin(s) — ${periodeLabel}
</div>
</body>
</html>`;

    const filename = `rapport_groupe_${period.annee}-${String(realMois).padStart(2, "0")}_${period.client_company.raisonSociale.replace(/\s+/g, "_").slice(0, 20)}.html`;
    const chemin = storeFile(filename, groupedHtml);
    const taille = Buffer.byteLength(groupedHtml, "utf-8");

    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId,
        clientCompanyId: period.clientCompanyId,
        type: "RAPPORT_GROUPE",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: taille,
        mimeType: "text/html",
        mois: realMois,
        annee: period.annee,
        periodePaieId: id,
        generePar: req.user!.userId,
      },
    });

    await auditLog({ workspaceId, userId: req.user!.userId, action: AUDIT_ACTIONS.RAPPORT_GROUPE_GENERATE, entity: "PayrollPeriod", entityId: id, details: JSON.stringify({ mois: realMois, annee: period.annee, nombreBulletins: payslips.length }) });

    return res.status(201).json({ document: doc, message: "Rapport groupé généré", nombreBulletins: payslips.length });
  } catch (err) { console.error("[reports] grouped-pdf:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:ws — Lister rapports générés
// ---------------------------------------------------------------------------
router.get("/:ws", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws, type: "RAPPORT_GROUPE" };
    if (req.query.annee) where.annee = parseInt(req.query.annee as string, 10);

    const docs = await prisma.documentStorage.findMany({ where, orderBy: { genereAt: "desc" } });
    return res.json(docs);
  } catch (err) { console.error("[reports] list:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:ws/:id — Détail rapport
// ---------------------------------------------------------------------------
router.get("/:ws/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const doc = await prisma.documentStorage.findFirst({ where: { id, workspaceId: ws, type: "RAPPORT_GROUPE" } });
    if (!doc) return res.status(404).json({ error: "Rapport introuvable" });
    return res.json(doc);
  } catch (err) { console.error("[reports] detail:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

export default router;
