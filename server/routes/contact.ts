// =============================================================================
// Le Fiduciaire — Messages de contact (Lot 4 — fin du mock)
// =============================================================================
// La page publique /contact affichait un faux accusé de réception : les
// messages n'allaient nulle part. Désormais :
//   - POST /api/contact (PUBLIC) : validation stricte + anti-abus en base
//     (max 5 messages / heure / IP — multi-instances OK, même principe que
//     login_attempts du Lot 3) + audit CONTACT_CREATE ;
//   - GET /api/contact (PROPRIETAIRE global) : liste + décompte non lus ;
//   - PATCH /api/contact/:id/lu (PROPRIETAIRE) : marquer lu / non lu ;
//   - DELETE /api/contact/:id (PROPRIETAIRE) : suppression + audit.
//
// Référence renvoyée à l'expéditeur : 8 premiers caractères de l'id cuid —
// suffisant pour un suivi conversationnel sans exposer l'identifiant complet.
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

// Miroir strict de la liste du frontend (client/src/pages/Contact.tsx) :
// une catégorie hors liste est rejetée (les deux listes évoluent ensemble).
const CATEGORIES = [
  "Question sur un calcul",
  "Signalement de bug",
  "Demande de fonctionnalité",
  "Problème d'export PDF",
  "Question légale / réglementaire",
  "Autre",
];

const MAX_PAR_HEURE = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// POST /api/contact — envoi public
// ---------------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  try {
    const { nom, email, objet, categorie, message } = req.body ?? {};

    // Validation stricte — mêmes bornes que le formulaire client
    if (typeof nom !== "string" || nom.trim().length < 1 || nom.trim().length > 100) {
      return res.status(400).json({ error: "Nom requis (100 caractères max)" });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 120) {
      return res.status(400).json({ error: "Adresse e-mail invalide" });
    }
    if (typeof objet !== "string" || objet.trim().length < 1 || objet.trim().length > 150) {
      return res.status(400).json({ error: "Objet requis (150 caractères max)" });
    }
    if (typeof categorie !== "string" || !CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: "Catégorie invalide" });
    }
    if (typeof message !== "string" || message.trim().length < 20 || message.length > 5000) {
      return res.status(400).json({ error: "Message requis (entre 20 et 5000 caractères)" });
    }

    // Anti-abus : comptage EN BASE par IP sur la dernière heure — les seuils
    // sont identiques sur toutes les instances serverless (principe Lot 3).
    // Prisma : { ip: null } signifie IS NULL (req.ip absent en dev direct).
    const depuisUneHeure = new Date(Date.now() - 60 * 60 * 1000);
    const recents = await prisma.contact_messages.count({
      where: { ip: req.ip ?? null, createdAt: { gte: depuisUneHeure } },
    });
    if (recents >= MAX_PAR_HEURE) {
      return res.status(429).json({
        error: "Trop de messages envoyés depuis cette adresse. Réessayez dans environ une heure.",
      });
    }

    const enregistre = await prisma.contact_messages.create({
      data: {
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        objet: objet.trim(),
        categorie,
        message: message.trim(),
        ip: req.ip ?? null,
      },
    });

    await auditLog({
      workspaceId: null, // événement public, hors workspace
      action: "CONTACT_CREATE",
      entity: "contact_messages",
      entityId: enregistre.id,
      details: JSON.stringify({ categorie, email: enregistre.email }),
      ipAddress: req.ip,
    });

    return res.status(201).json({
      id: enregistre.id,
      reference: enregistre.id.slice(0, 8).toUpperCase(),
      createdAt: enregistre.createdAt,
    });
  } catch (error) {
    console.error("[contact] création impossible :", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/contact — liste (PROPRIETAIRE global uniquement)
// ---------------------------------------------------------------------------
router.get(
  "/",
  requireAuth,
  requireRole("PROPRIETAIRE"),
  async (req: Request, res: Response) => {
    try {
      const nonLusSeuls = req.query.nonLus === "1";
      const messages = await prisma.contact_messages.findMany({
        where: nonLusSeuls ? { lu: false } : undefined,
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      const nonLus = await prisma.contact_messages.count({ where: { lu: false } });
      return res.json({ messages, nonLus });
    } catch (error) {
      console.error("[contact] liste impossible :", error);
      return res.status(500).json({ error: "Erreur interne" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/contact/:id/lu — marquer lu / non lu (PROPRIETAIRE)
// ---------------------------------------------------------------------------
router.patch(
  "/:id/lu",
  requireAuth,
  requireRole("PROPRIETAIRE"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { lu } = req.body ?? {};
      if (typeof lu !== "boolean") {
        return res.status(400).json({ error: "Champ lu (booléen) requis" });
      }
      const existant = await prisma.contact_messages.findUnique({ where: { id } });
      if (!existant) {
        return res.status(404).json({ error: "Message introuvable" });
      }
      const modifie = await prisma.contact_messages.update({
        where: { id },
        data: { lu },
      });
      return res.json({ id: modifie.id, lu: modifie.lu });
    } catch (error) {
      console.error("[contact] mise à jour impossible :", error);
      return res.status(500).json({ error: "Erreur interne" });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/contact/:id — suppression (PROPRIETAIRE) + audit
// ---------------------------------------------------------------------------
router.delete(
  "/:id",
  requireAuth,
  requireRole("PROPRIETAIRE"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existant = await prisma.contact_messages.findUnique({ where: { id } });
      if (!existant) {
        return res.status(404).json({ error: "Message introuvable" });
      }
      await prisma.contact_messages.delete({ where: { id } });
      await auditLog({
        workspaceId: null,
        userId: req.user?.userId,
        action: "CONTACT_DELETE",
        entity: "contact_messages",
        entityId: id,
        details: JSON.stringify({ email: existant.email, categorie: existant.categorie }),
        ipAddress: req.ip,
      });
      return res.status(204).send();
    } catch (error) {
      console.error("[contact] suppression impossible :", error);
      return res.status(500).json({ error: "Erreur interne" });
    }
  }
);

export default router;
