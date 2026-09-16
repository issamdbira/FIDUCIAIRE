// =============================================================================
// Le Fiduciaire — Provisioning d'un espace (Phase 10 — modèle espaces)
// =============================================================================
// Crée en une transaction : workspace (CABINET ou ENTREPRISE) + config paie
// (+ tranches IRPP, barème 2026 8 tranches) + le cas échéant la fiche société
// (ClientCompany) d'un espace Entreprise.
//
// Utilisé par :
//   - POST /api/auth/create-space   (flux B — auto-inscription publique)
//   - POST /api/workspaces/:ws/client-spaces (flux A — le cabinet crée
//     l'espace de son client)
// /auth/setup (bootstrap) garde sa logique propre, inchangée.
//
// Note : le barème ci-dessous est identique à server/routes/config.ts
// (IRPP_BAREME_2026) et au /auth/setup — conserver les trois alignés.
// =============================================================================

import prisma from "./prisma.js";
import type { TypeEspace } from "@prisma/client";

/** Barème IRPP 2026 — 8 tranches (source : LF 2025 art. 3, en vigueur 2026) */
export const BAREME_IRPP_PAR_DEFAUT = [
  { min: 0, max: 5000, taux: 0 },
  { min: 5000, max: 10000, taux: 0.15 },
  { min: 10000, max: 20000, taux: 0.25 },
  { min: 20000, max: 30000, taux: 0.3 },
  { min: 30000, max: 40000, taux: 0.33 },
  { min: 40000, max: 50000, taux: 0.36 },
  { min: 50000, max: 70000, taux: 0.38 },
  { min: 70000, max: null, taux: 0.4 },
];

export interface ChampsSociete {
  raisonSociale: string;
  matriculeFiscal?: string | null;
  matriculeCnss?: string | null;
  secteur?: string;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  contactNom?: string | null;
  contactTelephone?: string | null;
  contactEmail?: string | null;
}

export interface ProvisionOptions {
  /** Nom de l'espace (le nom de la société pour un espace ENTREPRISE) */
  name: string;
  /** CABINET | ENTREPRISE — immuable après création */
  type: TypeEspace;
  /** Fiche société — requise pour un espace ENTREPRISE (l'espace EST la société) */
  societe?: ChampsSociete;
  /**
   * Config paie source à recopier (p.ex. celle du cabinet créateur).
   * Absente → valeurs par défaut du schéma (identiques à /auth/setup).
   */
  configSourceId?: string | null;
  /**
   * Flux A : créer immédiatement la délégation ACTIVE
   * cabinet → nouvel espace (dans la MÊME transaction — pas d'orphelin).
   */
  delegationFrom?: { cabinetWorkspaceId: string; createdByUserId: string } | null;
}

/**
 * Crée l'espace complet en transaction. Retourne le workspace avec sa
 * config et sa fiche société le cas échéant. Aucune membership n'est créée
 * ici — l'appelant décide (PROPRIETAIRE du cabinet en flux A, compte
 * auto-inscrit en flux B).
 */
export async function provisionWorkspace(opts: ProvisionOptions) {
  if (opts.type === "ENTREPRISE" && !opts.societe?.raisonSociale) {
    throw new Error("raisonSociale requise pour un espace ENTREPRISE");
  }

  // Config paie source (copie) — sinon défauts du schéma
  let configSource: Record<string, number | boolean> | undefined;
  if (opts.configSourceId) {
    const src = await prisma.payrollConfig.findUnique({
      where: { id: opts.configSourceId },
    });
    if (src) {
      const {
        id: _id, workspaceId: _wsId, createdAt: _ca, updatedAt: _ua,
        ...champsCopies
      } = src;
      configSource = champsCopies as Record<string, number | boolean>;
    }
  }

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspaces.create({
      data: {
        name: opts.name,
        type: opts.type,
        secteur: opts.societe?.secteur && opts.societe.secteur !== ""
          ? opts.societe.secteur
          : "non_agricole",
        ...(opts.societe?.matriculeFiscal ? { matriculeFiscal: opts.societe.matriculeFiscal } : {}),
        ...(opts.societe?.matriculeCnss ? { matriculeCnss: opts.societe.matriculeCnss } : {}),
        ...(opts.societe?.adresse ? { address: opts.societe.adresse } : {}),
      },
    });

    const payrollConfig = await tx.payrollConfig.create({
      data: {
        workspaceId: workspace.id,
        ...(configSource ?? {}),
      },
    });

    await tx.tranches_irpp.createMany({
      data: BAREME_IRPP_PAR_DEFAUT.map((t, i) => ({
        payrollConfigId: payrollConfig.id,
        min: t.min,
        max: t.max,
        taux: t.taux,
        ordre: i + 1,
      })),
    });

    // Fiche société pour un espace ENTREPRISE (la société elle-même)
    let societe = null;
    if (opts.type === "ENTREPRISE" && opts.societe) {
      societe = await tx.clientCompany.create({
        data: {
          workspaceId: workspace.id,
          raisonSociale: opts.societe.raisonSociale,
          ...(opts.societe.matriculeFiscal ? { matriculeFiscal: opts.societe.matriculeFiscal } : {}),
          ...(opts.societe.matriculeCnss ? { matriculeCnss: opts.societe.matriculeCnss } : {}),
          ...(opts.societe.secteur ? { secteur: opts.societe.secteur as never } : {}),
          ...(opts.societe.adresse ? { adresse: opts.societe.adresse } : {}),
          ...(opts.societe.ville ? { ville: opts.societe.ville } : {}),
          ...(opts.societe.gouvernorat ? { gouvernorat: opts.societe.gouvernorat } : {}),
          ...(opts.societe.codePostal ? { codePostal: opts.societe.codePostal } : {}),
          ...(opts.societe.contactNom ? { contactNom: opts.societe.contactNom } : {}),
          ...(opts.societe.contactTelephone ? { contactTelephone: opts.societe.contactTelephone } : {}),
          ...(opts.societe.contactEmail ? { contactEmail: opts.societe.contactEmail } : {}),
        },
      });
    }

    // Flux A : délégation ACTIVE cabinet → nouvel espace, même transaction
    if (opts.delegationFrom) {
      await tx.delegated_access.create({
        data: {
          cabinetWorkspaceId: opts.delegationFrom.cabinetWorkspaceId,
          targetWorkspaceId: workspace.id,
          statut: "ACTIVE",
          createdByUserId: opts.delegationFrom.createdByUserId,
        },
      });
    }

    return { workspace, payrollConfig, societe };
  });
}
