// =============================================================================
// Le Fiduciaire — Pointage Mensuel Routes (Phase 4)
// POST   /api/attendance/import                     — Importer fichier Excel/CSV
// GET    /api/attendance/:workspaceId/imports        — Lister les imports
// GET    /api/attendance/:workspaceId/imports/:id    — Détail import + anomalies
// GET    /api/attendance/:workspaceId/summaries/:importId — Résumés par import
// GET    /api/attendance/:workspaceId/variables      — Variables de paie (filtres)
// GET    /api/attendance/:workspaceId/variables/:id  — Détail variable
// PATCH  /api/attendance/:workspaceId/variables/:id/validate — Valider
// PATCH  /api/attendance/:workspaceId/variables/:id/refuse  — Refuser
// POST   /api/attendance/template                   — Télécharger template Excel
// =============================================================================

import { Router, Request, Response } from "express";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, hasWorkspaceAccess } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";
import {
  parseFile,
  validateRows,
  createSummariesAndVariables,
  getPlageJoursOuvres,
  type AttendanceRow,
} from "../lib/attendance-import.js";
import * as XLSX from "xlsx";

const router = Router();

// Multer : upload en mémoire (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (
      ext.endsWith(".xlsx") || ext.endsWith(".xls") ||
      ext.endsWith(".csv") || ext.endsWith(".ods")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Format non supporté. Acceptés: .xlsx, .xls, .csv, .ods"));
    }
  },
});

// Helper : vérifier l'accès au workspace
async function checkWorkspaceAccess(userId: string, _role: string, workspaceId: string): Promise<boolean> {
  // Phase 10 : accès direct OU délégué (cabinet) — résolution centralisée rbac.ts
  return hasWorkspaceAccess(userId, workspaceId);
}

// ---------------------------------------------------------------------------
// POST /api/attendance/import — Importer fichier Excel/CSV
// ---------------------------------------------------------------------------
router.post("/import", requireAuth, upload.single("file"), requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, clientCompanyId, mois, annee } = req.body;

    if (!workspaceId || !clientCompanyId || !mois || !annee) {
      return res.status(400).json({ error: "workspaceId, clientCompanyId, mois et annee sont requis" });
    }

    const moisNum = parseInt(mois, 10);
    const anneeNum = parseInt(annee, 10);
    if (moisNum < 1 || moisNum > 12 || anneeNum < 2000 || anneeNum > 2100) {
      return res.status(400).json({ error: "mois (1-12) et annee (2000-2100) invalides" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Fichier requis (champ 'file')" });
    }

    // Vérifier l'accès
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier que le client existe dans ce workspace
    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) {
      return res.status(404).json({ error: "Entreprise cliente introuvable dans ce workspace" });
    }

    // Archivage bloquant : pas d'import de pointage pour un client ARCHIVED
    if (client.statut === "ARCHIVED") {
      return res.status(409).json({ error: "Client archivé — réactivez-le avant d'importer du pointage" });
    }

    // Parser le fichier
    let rows;
    try {
      rows = parseFile(req.file.buffer, req.file.originalname);
    } catch (parseError) {
      return res.status(400).json({
        error: `Erreur de parsing: ${(parseError as Error).message}`,
      });
    }

    // Valider les lignes (plage 40h/48h — cf. lib pour la règle)
    const plageJours = getPlageJoursOuvres(moisNum, anneeNum);
    const validationResult = await validateRows(rows, workspaceId, plageJours);

    // Créer l'enregistrement import
    const statutImport = validationResult.hasBloquantes
      ? (validationResult.lignesOk === 0 ? "REJETE" : "ANOMALIES")
      : "VALIDE";

    const attendanceImport = await prisma.attendanceImport.create({
      data: {
        workspaceId,
        clientCompanyId,
        mois: moisNum,
        annee: anneeNum,
        nomFichier: req.file.originalname,
        tailleFichier: req.file.size,
        statut: statutImport,
        lignesTotal: validationResult.lignesTotal,
        lignesOk: validationResult.lignesOk,
        lignesAnomalie: validationResult.lignesAnomalie,
        anomalies: validationResult.anomalies as any,
        importedBy: req.user!.userId,
      },
    });

    // Créer les summaries + variables de paie pour les lignes valides
    let summariesCreated = 0;
    let variablesCreated = 0;
    if (statutImport !== "REJETE") {
      const result = await createSummariesAndVariables(
        attendanceImport.id,
        validationResult.rows,
        validationResult.anomalies,
        workspaceId,
        moisNum,
        anneeNum,
        plageJours.plafond,
      );
      summariesCreated = result.summariesCreated;
      variablesCreated = result.variablesCreated;
    }

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "ATTENDANCE_IMPORT",
      entity: "AttendanceImport",
      entityId: attendanceImport.id, // P0-2 : undefined créait un NULL en base → crash DashboardCabinet (truncate(null))
      details: JSON.stringify({ clientCompanyId, mois: moisNum, annee: anneeNum, fichier: req.file?.originalname }),
      ipAddress: req.ip,
    });

    return res.status(201).json({
      import: attendanceImport,
      summariesCreated,
      variablesCreated,
      message: statutImport === "REJETE"
        ? "Import rejeté — toutes les lignes contiennent des anomalies bloquantes"
        : statutImport === "ANOMALIES"
          ? `Import partiel : ${summariesCreated} salarié(s) enregistré(s), ${validationResult.lignesAnomalie} ligne(s) avec anomalies`
          : `Import validé : ${summariesCreated} salarié(s) pointé(s) sur ${validationResult.lignesTotal} ligne(s) lue(s)`,
    });
  } catch (error) {
    console.error("[attendance] POST import error:", error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erreur upload: ${error.message}` });
    }
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/attendance/:workspaceId/manual — Saisie manuelle du pointage
// (exigence TPE : sans fichier Excel). Même pipeline que l'import :
// validateRows → anomalies → summaries + variables PROPOSEE.
// Idempotent par société/mois/année : remplace la saisie manuelle précédente.
// ---------------------------------------------------------------------------
router.post("/:workspaceId/manual", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { clientCompanyId, mois, annee, lignes } = req.body;

    if (!clientCompanyId || !mois || !annee) {
      return res.status(400).json({ error: "clientCompanyId, mois et annee sont requis" });
    }
    const moisNum = parseInt(mois, 10);
    const anneeNum = parseInt(annee, 10);
    if (moisNum < 1 || moisNum > 12 || anneeNum < 2000 || anneeNum > 2100) {
      return res.status(400).json({ error: "mois (1-12) et annee (2000-2100) invalides" });
    }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: "lignes (saisie des salariés) sont requises" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) return res.status(404).json({ error: "Entreprise cliente introuvable" });
    if (client.statut === "ARCHIVED") {
      return res.status(409).json({ error: "Client archivé — réactivez-le avant de saisir du pointage" });
    }

    // Construire les lignes au même format que l'import (validation partagée)
    const toNum = (v: unknown): number => {
      const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    };
    const rows: AttendanceRow[] = [];
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i] ?? {};
      rows.push({
        ligne: i + 2, // cohérent avec l'import (1 = en-tête)
        matricule: String(l.matricule ?? "").trim(),
        nomPrenom: String(l.nomPrenom ?? "").trim(),
        joursTravaillesReels: toNum(l.joursTravaillesReels),
        congesPayes: toNum(l.congesPayes),
        absencesJustifiees: toNum(l.absencesJustifiees),
        absencesNonJustifiees: toNum(l.absencesNonJustifiees),
        heuresSupplementaires: toNum(l.heuresSupplementaires),
      });
    }

    const plageJours = getPlageJoursOuvres(moisNum, anneeNum);
    const validationResult = await validateRows(rows, workspaceId, plageJours);

    const statutSaisie = validationResult.hasBloquantes
      ? (validationResult.lignesOk === 0 ? "REJETE" : "ANOMALIES")
      : "VALIDE";

    // Idempotence : remplacer la saisie manuelle précédente de la même période
    // (summaries et variables partent en cascade — pas de doublons au recalcul)
    const MANUEL_NOM = "saisie-manuelle";
    await prisma.attendanceImport.deleteMany({
      where: { workspaceId, clientCompanyId, mois: moisNum, annee: anneeNum, nomFichier: MANUEL_NOM },
    });

    const attendanceImport = await prisma.attendanceImport.create({
      data: {
        workspaceId,
        clientCompanyId,
        mois: moisNum,
        annee: anneeNum,
        nomFichier: MANUEL_NOM,
        tailleFichier: null,
        statut: statutSaisie,
        lignesTotal: validationResult.lignesTotal,
        lignesOk: validationResult.lignesOk,
        lignesAnomalie: validationResult.lignesAnomalie,
        anomalies: validationResult.anomalies as any,
        importedBy: req.user!.userId,
      },
    });

    let summariesCreated = 0;
    let variablesCreated = 0;
    if (statutSaisie !== "REJETE") {
      const result = await createSummariesAndVariables(
        attendanceImport.id,
        validationResult.rows,
        validationResult.anomalies,
        workspaceId,
        moisNum,
        anneeNum,
        plageJours.plafond,
      );
      summariesCreated = result.summariesCreated;
      variablesCreated = result.variablesCreated;
    }

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "ATTENDANCE_MANUAL",
      entity: "AttendanceImport",
      entityId: attendanceImport.id,
      details: JSON.stringify({ clientCompanyId, mois: moisNum, annee: anneeNum, lignes: rows.length }),
      ipAddress: req.ip,
    });

    return res.status(201).json({
      import: attendanceImport,
      summariesCreated,
      variablesCreated,
      anomalies: validationResult.anomalies,
      message: statutSaisie === "REJETE"
        ? "Saisie rejetée — toutes les lignes contiennent des anomalies bloquantes"
        : statutSaisie === "ANOMALIES"
          ? `Saisie partielle : ${summariesCreated} ligne(s) enregistrée(s), ${validationResult.lignesAnomalie} avec anomalies`
          : `Saisie enregistrée : ${summariesCreated} ligne(s) enregistrée(s), ${variablesCreated} variable(s) de paie créée(s)`,
    });
  } catch (error) {
    console.error("[attendance] POST manual error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attendance/:workspaceId/imports — Lister les imports
// ---------------------------------------------------------------------------
router.get("/:workspaceId/imports", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { mois, annee, clientCompanyId } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId };
    if (mois) where.mois = parseInt(mois as string, 10);
    if (annee) where.annee = parseInt(annee as string, 10);
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;

    const imports = await prisma.attendanceImport.findMany({
      where,
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
        _count: { select: { summaries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(imports);
  } catch (error) {
    console.error("[attendance] GET imports error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attendance/:workspaceId/imports/:id — Détail import + anomalies
// ---------------------------------------------------------------------------
router.get("/:workspaceId/imports/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const imp = await prisma.attendanceImport.findFirst({
      where: { id, workspaceId },
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
      },
    });

    if (!imp) return res.status(404).json({ error: "Import introuvable" });

    return res.json(imp);
  } catch (error) {
    console.error("[attendance] GET import detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attendance/:workspaceId/summaries/:importId — Résumés par import
// ---------------------------------------------------------------------------
router.get("/:workspaceId/summaries/:importId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, importId } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const summaries = await prisma.attendanceSummary.findMany({
      where: { importId, workspaceId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, matriculeCnss: true } },
        _count: { select: { variables: true } },
      },
      orderBy: { nomPrenom: "asc" },
    });

    return res.json(summaries);
  } catch (error) {
    console.error("[attendance] GET summaries error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attendance/:workspaceId/variables — Variables de paie
// ---------------------------------------------------------------------------
router.get("/:workspaceId/variables", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { mois, annee, statut, employeeId } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId };
    if (mois) where.mois = parseInt(mois as string, 10);
    if (annee) where.annee = parseInt(annee as string, 10);
    if (statut) where.statut = statut;
    if (employeeId) where.employeeId = employeeId;

    const variables = await prisma.payrollVariable.findMany({
      where,
      include: {
        attendance_summary: {
          select: { matricule: true, nomPrenom: true },
        },
      },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });

    return res.json(variables);
  } catch (error) {
    console.error("[attendance] GET variables error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attendance/:workspaceId/variables/:id — Détail variable
// ---------------------------------------------------------------------------
router.get("/:workspaceId/variables/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const variable = await prisma.payrollVariable.findFirst({
      where: { id, workspaceId },
      include: {
        attendance_summary: true,
      },
    });

    if (!variable) return res.status(404).json({ error: "Variable introuvable" });

    return res.json(variable);
  } catch (error) {
    console.error("[attendance] GET variable detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/attendance/:workspaceId/variables/:id/validate — Valider variable
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/variables/:id/validate", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { noteValidation } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const existing = await prisma.payrollVariable.findFirst({ where: { id, workspaceId } });
    if (!existing) return res.status(404).json({ error: "Variable introuvable" });
    if (existing.statut !== "PROPOSEE") {
      return res.status(400).json({ error: `Variable déjà ${existing.statut}` });
    }

    const updated = await prisma.payrollVariable.update({
      where: { id },
      data: {
        statut: "VALIDEE",
        validatedBy: req.user!.userId,
        validatedAt: new Date(),
        noteValidation: noteValidation || null,
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "ATTENDANCE_VARIABLE_VALIDATE",
      entity: "PayrollVariable",
      entityId: id,
      details: JSON.stringify({ avant: existing.statut, apres: "VALIDEE", note: noteValidation || null }),
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error("[attendance] validate error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/attendance/:workspaceId/variables/:id/refuse — Refuser variable
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/variables/:id/refuse", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { noteValidation } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) return res.status(403).json({ error: "Accès refusé" });

    const existing = await prisma.payrollVariable.findFirst({ where: { id, workspaceId } });
    if (!existing) return res.status(404).json({ error: "Variable introuvable" });
    if (existing.statut !== "PROPOSEE") {
      return res.status(400).json({ error: `Variable déjà ${existing.statut}` });
    }

    const updated = await prisma.payrollVariable.update({
      where: { id },
      data: {
        statut: "REFUSEE",
        validatedBy: req.user!.userId,
        validatedAt: new Date(),
        noteValidation: noteValidation || null,
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "ATTENDANCE_VARIABLE_REFUSE",
      entity: "PayrollVariable",
      entityId: id,
      details: JSON.stringify({ avant: existing.statut, apres: "REFUSEE", note: noteValidation || null }),
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error("[attendance] refuse error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/attendance/template — Générer template Excel standardisé
// ---------------------------------------------------------------------------
router.post("/template", requireAuth, requireWorkspaceMember(), async (_req: Request, res: Response) => {
  try {
    const headers = [
      "Matricule",
      "Nom & Prénom",
      "Jours travaillés réels",
      "Congés payés",
      "Absences justifiées",
      "Absences non justifiées",
      "Heures supplémentaires",
    ];

    const exampleRow = [
      "CNSS-001",
      "Mohamed Bouazizi",
      26,
      0,
      0,
      0,
      0,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Largeur des colonnes
    ws["!cols"] = [
      { wch: 15 }, { wch: 30 }, { wch: 22 },
      { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pointage");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=template_pointage.xlsx");
    return res.send(buffer);
  } catch (error) {
    console.error("[attendance] template error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
