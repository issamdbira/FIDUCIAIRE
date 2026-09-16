// =============================================================================
// Le Fiduciaire — Routes Déclarations CNSS (Phase 7)
// POST   /api/cnss/declarations                     — Créer déclaration CNSS
// GET    /api/cnss/:ws/declarations                  — Lister déclarations
// GET    /api/cnss/:ws/declarations/:id              — Détail déclaration
// PATCH  /api/cnss/:ws/declarations/:id/controler    — BROUILLON → CONTROLEE
// PATCH  /api/cnss/:ws/declarations/:id/generer      — CONTROLEE → GENEREE (+ export)
// PATCH  /api/cnss/:ws/declarations/:id/archiver     — GENEREE → ARCHIVEE
// POST   /api/cnss/declarations/:id/export           — Générer fichier export CNSS
// GET    /api/cnss/declarations/:id/download         — Télécharger fichier export CNSS
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner } from "../middleware/rbac.js";
import {
  generateCnssExportText,
  generateCnssExportCsv,
  storeCnssFile,
  cnssFileExists,
  getMoisTrimestre,
} from "../lib/cnss-export.js";
import { storeFile } from "../lib/document-generator.js";
import { auditLog, AUDIT_ACTIONS } from "../lib/audit-log.js";

const router = Router();

async function checkWs(userId: string, _role: string, ws: string): Promise<boolean> {
  // Sécurité (Phase 10) : plus de bypass « rôle global PROPRIETAIRE »
  const m = await prisma.workspace_members.findUnique({ where: { userId_workspaceId: { userId, workspaceId: ws } } });
  return !!m;
}

const CNSS_TRANSITIONS: Record<string, string[]> = {
  BROUILLON: ["CONTROLEE"],
  CONTROLEE: ["GENEREE", "BROUILLON"],
  GENEREE: ["ARCHIVEE"],
  ARCHIVEE: [],
};

// ---------------------------------------------------------------------------
// POST /api/cnss/declarations — Créer déclaration CNSS
// Regroupe les 3 périodes mensuelles validées d'un trimestre
// ---------------------------------------------------------------------------
router.post("/declarations", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, clientCompanyId, annee, numeroTrimestre, note } = req.body;
    if (!workspaceId || !clientCompanyId || !annee || !numeroTrimestre) {
      return res.status(400).json({ error: "workspaceId, clientCompanyId, annee et numeroTrimestre requis" });
    }

    const a = parseInt(annee, 10);
    const t = parseInt(numeroTrimestre, 10);
    if (t < 1 || t > 4) return res.status(400).json({ error: "numeroTrimestre doit être 1, 2, 3 ou 4" });
    if (a < 2000 || a > 2100) return res.status(400).json({ error: "annee invalide" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) return res.status(404).json({ error: "Client introuvable" });

    // Vérifier doublon
    const existing = await prisma.cNSSDeclaration.findUnique({
      where: { workspaceId_clientCompanyId_annee_numeroTrimestre: { workspaceId, clientCompanyId, annee: a, numeroTrimestre: t } },
    });
    if (existing) return res.status(409).json({ error: "Déclaration CNSS déjà existante pour ce trimestre", declaration: existing });

    // Trouver les 3 périodes de paie validées du trimestre
    const moisTrimestre = getMoisTrimestre(t);
    const periods = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId,
        clientCompanyId,
        annee: a,
        mois: { in: moisTrimestre },
        statut: { in: ["VALIDATED", "CLOSED"] },
      },
      include: { payslips: { include: { anomalies: false } } },
      orderBy: { mois: "asc" },
    });

    // Calculer les totaux à partir des bulletins des périodes trouvées
    let nombreSalaries = 0;
    let totalSalaires = 0;
    let totalCotisationsSalariales = 0;
    let totalCotisationsPatronales = 0;
    let matriculesManquants = 0;
    const employeeSet = new Set<string>();

    for (const period of periods) {
      for (const ps of period.payslips) {
        if (!employeeSet.has(ps.employeeId)) {
          employeeSet.add(ps.employeeId);
          nombreSalaries++;
          // Vérifier matricule CNSS manquant
          if (!ps.matricule || ps.matricule.trim() === "" || ps.matricule.startsWith("TEMP-")) {
            matriculesManquants++;
          }
        }
        totalSalaires += ps.salaireBrutEffectif;
        totalCotisationsSalariales += ps.retenueCnssSalarial;
        totalCotisationsPatronales += ps.retenueCnssPatronal;
      }
    }

    // Associer les IDs des périodes trouvées
    const periodeMois1 = periods.find(p => p.mois === moisTrimestre[0]);
    const periodeMois2 = periods.find(p => p.mois === moisTrimestre[1]);
    const periodeMois3 = periods.find(p => p.mois === moisTrimestre[2]);

    const trimestre = `${a}-Q${t}`;

    const declaration = await prisma.cNSSDeclaration.create({
      data: {
        workspaceId,
        clientCompanyId,
        trimestre,
        annee: a,
        numeroTrimestre: t,
        nombreSalaries,
        totalSalaires,
        totalCotisationsSalariales,
        totalCotisationsPatronales,
        matriculesManquants,
        periodeMois1Id: periodeMois1?.id || null,
        periodeMois2Id: periodeMois2?.id || null,
        periodeMois3Id: periodeMois3?.id || null,
        note: note || null,
        createdBy: req.user!.userId,
      },
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true } } },
    });

    return res.status(201).json({
      declaration,
      periodesTrouvees: periods.length,
      periodesAttendues: 3,
      matriculesManquants,
    });
  } catch (err) { console.error("[cnss] POST declarations:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/cnss/:ws/declarations — Lister déclarations
// ---------------------------------------------------------------------------
router.get("/:ws/declarations", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws };
    if (req.query.statut) where.statut = req.query.statut;
    if (req.query.clientCompanyId) where.clientCompanyId = req.query.clientCompanyId;
    if (req.query.annee) where.annee = parseInt(req.query.annee as string, 10);

    const declarations = await prisma.cNSSDeclaration.findMany({
      where,
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true } }, _count: { select: { cnss_documents: true } } },
      orderBy: [{ annee: "desc" }, { numeroTrimestre: "desc" }],
    });

    return res.json(declarations);
  } catch (err) { console.error("[cnss] GET declarations:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/cnss/:ws/declarations/:id — Détail déclaration
// ---------------------------------------------------------------------------
router.get("/:ws/declarations/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const declaration = await prisma.cNSSDeclaration.findFirst({
      where: { id, workspaceId: ws },
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true, matriculeFiscal: true } }, cnss_documents: true },
    });
    if (!declaration) return res.status(404).json({ error: "Déclaration introuvable" });
    return res.json(declaration);
  } catch (err) { console.error("[cnss] GET declaration:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/cnss/:ws/declarations/:id/controler — BROUILLON → CONTROLEE
// ---------------------------------------------------------------------------
router.patch("/:ws/declarations/:id/controler", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const decl = await prisma.cNSSDeclaration.findUnique({ where: { id } });
    if (!decl || decl.workspaceId !== ws) return res.status(404).json({ error: "Déclaration introuvable" });

    const allowed = CNSS_TRANSITIONS[decl.statut] || [];
    if (!allowed.includes("CONTROLEE")) return res.status(400).json({ error: `Transition ${decl.statut}→CONTROLEE impossible` });

    const updated = await prisma.cNSSDeclaration.update({
      where: { id },
      data: { statut: "CONTROLEE", controlledBy: req.user!.userId, dateControle: new Date() },
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true } } },
    });
    return res.json(updated);
  } catch (err) { console.error("[cnss] controler:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/cnss/:ws/declarations/:id/generer — CONTROLEE → GENEREE
// Génère le fichier export CNSS et le stocke
// ---------------------------------------------------------------------------
router.patch("/:ws/declarations/:id/generer", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const decl = await prisma.cNSSDeclaration.findUnique({
      where: { id },
      include: { client_company: true },
    });
    if (!decl || decl.workspaceId !== ws) return res.status(404).json({ error: "Déclaration introuvable" });

    const allowed = CNSS_TRANSITIONS[decl.statut] || [];
    if (!allowed.includes("GENEREE")) return res.status(400).json({ error: `Transition ${decl.statut}→GENEREE impossible` });

    // Vérifier matricules CNSS manquants
    if (decl.matriculesManquants > 0) {
      return res.status(400).json({ error: `${decl.matriculesManquants} matricule(s) CNSS manquant(s) — compléter avant génération` });
    }

    // Collecter les données des bulletins pour l'export
    const moisTrimestre = getMoisTrimestre(decl.numeroTrimestre);
    const periodIds = [decl.periodeMois1Id, decl.periodeMois2Id, decl.periodeMois3Id].filter(Boolean) as string[];

    const payslips = await prisma.payslip.findMany({
      where: { periodId: { in: periodIds }, workspaceId: ws },
      orderBy: { nomPrenom: "asc" },
    });

    // Regrouper par employé
    const employeeMap = new Map<string, {
      matricule: string; nom: string; prenom: string;
      salaireBrut: number[]; cotSal: number; cotPat: number; jours: number[];
    }>();

    for (const ps of payslips) {
      if (!employeeMap.has(ps.employeeId)) {
        const parts = ps.nomPrenom.split(" ");
        employeeMap.set(ps.employeeId, {
          matricule: ps.matricule,
          nom: parts[parts.length - 1] || "",
          prenom: parts.slice(0, -1).join(" ") || "",
          salaireBrut: [0, 0, 0],
          cotSal: 0,
          cotPat: 0,
          jours: [0, 0, 0],
        });
      }
      const emp = employeeMap.get(ps.employeeId)!;
      // Déterminer l'index du mois dans le trimestre
      const moisIndex = moisTrimestre.indexOf(ps.mois);
      if (moisIndex >= 0) {
        emp.salaireBrut[moisIndex] += ps.salaireBrutEffectif;
        emp.jours[moisIndex] += ps.joursTravailles;
      }
      emp.cotSal += ps.retenueCnssSalarial;
      emp.cotPat += ps.retenueCnssPatronal;
    }

    // Générer le fichier export
    const exportData = {
      matriculeEmployeur: decl.client_company.matriculeCnss || "INCONNU",
      raisonSociale: decl.client_company.raisonSociale,
      trimestre: decl.trimestre,
      annee: decl.annee,
      numeroTrimestre: decl.numeroTrimestre,
      nombreSalaries: decl.nombreSalaries,
      totalSalaires: decl.totalSalaires,
      totalCotisationsSalariales: decl.totalCotisationsSalariales,
      totalCotisationsPatronales: decl.totalCotisationsPatronales,
      employees: Array.from(employeeMap.values()).map(e => ({
        matriculeCnss: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        salaireBrutMois1: e.salaireBrut[0],
        salaireBrutMois2: e.salaireBrut[1],
        salaireBrutMois3: e.salaireBrut[2],
        cotisationSalariale: e.cotSal,
        cotisationPatronale: e.cotPat,
        nombreJoursMois1: e.jours[0],
        nombreJoursMois2: e.jours[1],
        nombreJoursMois3: e.jours[2],
      })),
    };

    const exportText = generateCnssExportText(exportData);
    const filename = `cnss_${decl.trimestre.replace("-", "")}_${decl.client_company.matriculeCnss || "export"}.txt`;
    const chemin = storeCnssFile(filename, exportText);
    const taille = Buffer.byteLength(exportText, "utf-8");

    // Stocker en base
    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId: ws,
        clientCompanyId: decl.clientCompanyId,
        cnssDeclarationId: id,
        type: "EXPORT_CNSS",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: taille,
        mimeType: "text/plain",
        annee: decl.annee,
        generePar: req.user!.userId,
      },
    });

    // Mettre à jour déclaration
    const updated = await prisma.cNSSDeclaration.update({
      where: { id },
      data: { statut: "GENEREE", generatedBy: req.user!.userId, dateGeneration: new Date() },
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true } } },
    });

    await auditLog({ workspaceId: ws, userId: req.user!.userId, action: AUDIT_ACTIONS.CNSS_GENERATE, entity: "CNSSDeclaration", entityId: id, details: JSON.stringify({ trimestre: decl.trimestre, filename }) });

    return res.json({ declaration: updated, document: doc, filename });
  } catch (err) { console.error("[cnss] generer:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/cnss/:ws/declarations/:id/archiver — GENEREE → ARCHIVEE
// ---------------------------------------------------------------------------
router.patch("/:ws/declarations/:id/archiver", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const decl = await prisma.cNSSDeclaration.findUnique({ where: { id } });
    if (!decl || decl.workspaceId !== ws) return res.status(404).json({ error: "Déclaration introuvable" });

    const allowed = CNSS_TRANSITIONS[decl.statut] || [];
    if (!allowed.includes("ARCHIVEE")) return res.status(400).json({ error: `Transition ${decl.statut}→ARCHIVEE impossible` });

    const updated = await prisma.cNSSDeclaration.update({
      where: { id },
      data: { statut: "ARCHIVEE", archivedBy: req.user!.userId, dateArchivage: new Date() },
      include: { client_company: { select: { id: true, raisonSociale: true, matriculeCnss: true } } },
    });
    await auditLog({ workspaceId: ws, userId: req.user!.userId, action: AUDIT_ACTIONS.CNSS_ARCHIVE, entity: "CNSSDeclaration", entityId: id, details: JSON.stringify({ trimestre: decl.trimestre }) });
    return res.json(updated);
  } catch (err) { console.error("[cnss] archiver:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// POST /api/cnss/declarations/:id/export — Générer fichier export CNSS (sans transition)
// ---------------------------------------------------------------------------
router.post("/declarations/:id/export", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const decl = await prisma.cNSSDeclaration.findFirst({
      where: { id, workspaceId },
      include: { client_company: true },
    });
    if (!decl) return res.status(404).json({ error: "Déclaration introuvable" });

    // Vérifier si export déjà généré
    const existing = await prisma.documentStorage.findFirst({
      where: { cnssDeclarationId: id, type: "EXPORT_CNSS" },
    });
    if (existing && cnssFileExists(existing.cheminStockage)) {
      return res.json({ document: existing, message: "Export CNSS déjà généré" });
    }

    // Collecter données et générer (même logique que generer)
    const moisTrimestre = getMoisTrimestre(decl.numeroTrimestre);
    const periodIds = [decl.periodeMois1Id, decl.periodeMois2Id, decl.periodeMois3Id].filter(Boolean) as string[];

    const payslips = await prisma.payslip.findMany({
      where: { periodId: { in: periodIds }, workspaceId },
      orderBy: { nomPrenom: "asc" },
    });

    const employeeMap = new Map<string, {
      matricule: string; nom: string; prenom: string;
      salaireBrut: number[]; cotSal: number; cotPat: number; jours: number[];
    }>();

    for (const ps of payslips) {
      if (!employeeMap.has(ps.employeeId)) {
        const parts = ps.nomPrenom.split(" ");
        employeeMap.set(ps.employeeId, {
          matricule: ps.matricule, nom: parts[parts.length - 1] || "", prenom: parts.slice(0, -1).join(" ") || "",
          salaireBrut: [0, 0, 0], cotSal: 0, cotPat: 0, jours: [0, 0, 0],
        });
      }
      const emp = employeeMap.get(ps.employeeId)!;
      const moisIndex = moisTrimestre.indexOf(ps.mois);
      if (moisIndex >= 0) {
        emp.salaireBrut[moisIndex] += ps.salaireBrutEffectif;
        emp.jours[moisIndex] += ps.joursTravailles;
      }
      emp.cotSal += ps.retenueCnssSalarial;
      emp.cotPat += ps.retenueCnssPatronal;
    }

    const exportData = {
      matriculeEmployeur: decl.client_company.matriculeCnss || "INCONNU",
      raisonSociale: decl.client_company.raisonSociale,
      trimestre: decl.trimestre,
      annee: decl.annee,
      numeroTrimestre: decl.numeroTrimestre,
      nombreSalaries: decl.nombreSalaries,
      totalSalaires: decl.totalSalaires,
      totalCotisationsSalariales: decl.totalCotisationsSalariales,
      totalCotisationsPatronales: decl.totalCotisationsPatronales,
      employees: Array.from(employeeMap.values()).map(e => ({
        matriculeCnss: e.matricule, nom: e.nom, prenom: e.prenom,
        salaireBrutMois1: e.salaireBrut[0], salaireBrutMois2: e.salaireBrut[1], salaireBrutMois3: e.salaireBrut[2],
        cotisationSalariale: e.cotSal, cotisationPatronale: e.cotPat,
        nombreJoursMois1: e.jours[0], nombreJoursMois2: e.jours[1], nombreJoursMois3: e.jours[2],
      })),
    };

    const exportText = generateCnssExportText(exportData);
    const filename = `cnss_${decl.trimestre.replace("-", "")}_${decl.client_company.matriculeCnss || "export"}.txt`;
    const chemin = storeCnssFile(filename, exportText);
    const taille = Buffer.byteLength(exportText, "utf-8");

    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId,
        clientCompanyId: decl.clientCompanyId,
        cnssDeclarationId: id,
        type: "EXPORT_CNSS",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: taille,
        mimeType: "text/plain",
        annee: decl.annee,
        generePar: req.user!.userId,
      },
    });

    return res.status(201).json({ document: doc, message: "Export CNSS généré" });
  } catch (err) { console.error("[cnss] export:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/cnss/declarations/:id/download — Télécharger fichier export CNSS
// ---------------------------------------------------------------------------
router.get("/declarations/:id/download", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const doc = await prisma.documentStorage.findFirst({
      where: { cnssDeclarationId: id, type: "EXPORT_CNSS", workspaceId },
    });
    if (!doc) return res.status(404).json({ error: "Export CNSS non généré" });

    if (!cnssFileExists(doc.cheminStockage)) return res.status(404).json({ error: "Fichier introuvable sur le stockage" });

    const fs = await import("fs");
    const content = fs.readFileSync(doc.cheminStockage);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.nomFichier}"`);
    return res.send(content);
  } catch (err) { console.error("[cnss] download:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

export default router;
