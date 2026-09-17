// =============================================================================
// Le Fiduciaire — Moteur de Paie (Phase 5)
// Calcul modulaire du bulletin de paie tunisien
// =============================================================================

import prisma from "./prisma.js";
import { round2Exact } from "./money.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PayrollInput {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    matriculeCnss: string;
    civilStatus: string;
    numberOfChildren: number;
    baseSalary: number;
    clientCompanyId: string | null;
  };
  contractVersion: {
    id: string;
    salaireBrut: number;
    heuresHebdomadaires: number | null;
    heuresMensuelles: number | null;
    coefficient: string | null;
    echelon: string | null;
  } | null;
  attendance: {
    joursTravaillesReels: number;
    congesPayes: number;
    absencesJustifiees: number;
    absencesNonJustifiees: number;
    heuresSupplementaires: number;
    joursOuvresTotal: number | null;
    tauxPresence: number | null;
  } | null;
  payrollConfig: {
    cnssSalarialNonAgricole: number;
    cnssPatronalNonAgricole: number;
    cnssSalarialAgricole: number;
    cnssPatronalAgricole: number;
    cssActive: boolean;
    cssTaux: number;
    cssSeuilExonerationAnnuel: number;
    fraisProTauxActifs: number;
    fraisProPlafondActifsAnnuel: number;
    fraisProTauxRetraites: number;
    deductionChefFamille: number;
    deductionEnfant: number;
    deductionEtudiant: number;
    plafondNombreEnfantsEtudiants: number;
    deductionInfirme: number;
    parentsEnChargeActif: boolean;
    parentsEnChargeTaux: number;
    parentsEnChargePlafondParAnnuel: number;
    secteur: string;
  };
  tranchesIrpp: Array<{ min: number; max: number | null; taux: number; ordre: number }>;
  clientSecteur: string;  // Secteur du client (NON_AGRICOLE, AGRICOLE, etc.)
  joursOuvresMois: number; // Jours ouvrés du mois
}

export interface PayslipResult {
  // Données d'entrée
  salaireBrutContractuel: number;
  tauxPresence: number;
  joursTravailles: number;
  joursAbsence: number;
  heuresSupplementaires: number;

  // Calculs intermédiaires
  salaireBrutEffectif: number;
  montantHeuresSup: number;
  montantAbsence: number;
  baseImposable: number;

  // Cotisations salariales
  retenueCnssSalarial: number;
  retenueCss: number;
  totalRetenuesSalariales: number;

  // Cotisations patronales
  retenueCnssPatronal: number;

  // Fiscal
  fraisProfessionnels: number;
  netImposableAvantDeductions: number;
  deductionChefFamille: number;
  deductionEnfants: number;
  deductionParents: number;
  totalDeductionsFamiliales: number;
  baseIrpp: number;
  retenueIrpp: number;

  // Résultat
  salaireNet: number;
  tauxHoraire: number | null;
}

export interface PayrollAnomaly {
  code: string;
  niveau: "BLOQUANTE" | "AVERTISSEMENT" | "INFORMATION";
  message: string;
  employeeId?: string;
  payslipId?: string;
}

export interface CalculatePayrollOutput {
  payslip: PayslipResult;
  anomalies: PayrollAnomaly[];
}

// ---------------------------------------------------------------------------
// Moteur de calcul — calculatePayroll
// ---------------------------------------------------------------------------

export function calculatePayroll(input: PayrollInput): CalculatePayrollOutput {
  const anomalies: PayrollAnomaly[] = [];
  const employee = input.employee;
  const config = input.payrollConfig;

  // --- 1. Salaire brut contractuel ---
  const salaireBrutContractuel = input.contractVersion
    ? input.contractVersion.salaireBrut
    : employee.baseSalary;

  if (salaireBrutContractuel <= 0) {
    anomalies.push({
      code: "SALAIRE_BRUT_NEGATIF",
      niveau: "BLOQUANTE",
      message: `Salaire brut contractuel invalide: ${salaireBrutContractuel} DT`,
      employeeId: employee.id,
    });
  }

  // --- 2. Taux de présence ---
  let tauxPresence = 1.0; // Par défaut : présence complète
  if (input.attendance && input.attendance.tauxPresence !== null) {
    tauxPresence = input.attendance.tauxPresence;
  } else if (input.attendance && input.attendance.joursOuvresTotal && input.attendance.joursOuvresTotal > 0) {
    // P1-6 (réévaluation) : les congés payés sont RÉMUNÉRÉS — réels + congés
    // au numérateur ; seules les absences justifiées (indemnisées CNSS)
    // réduisent la rémunération d'activité.
    tauxPresence = (input.attendance.joursTravaillesReels + input.attendance.congesPayes)
      / input.attendance.joursOuvresTotal;
  }

  // Clamp tauxPresence between 0 and 1
  if (tauxPresence < 0) {
    anomalies.push({
      code: "TAUX_PRESENCE_NEGATIF",
      niveau: "BLOQUANTE",
      message: `Taux de présence négatif: ${(tauxPresence * 100).toFixed(2)}%`,
      employeeId: employee.id,
    });
    tauxPresence = 0;
  }
  if (tauxPresence > 1) {
    anomalies.push({
      code: "TAUX_PRESENCE_EXCESSIF",
      niveau: "AVERTISSEMENT",
      message: `Taux de présence > 100%: ${(tauxPresence * 100).toFixed(2)}% — vérifier le pointage`,
      employeeId: employee.id,
    });
    tauxPresence = 1;
  }

  // --- 3. Jours travaillés & absences ---
  const joursTravailles = input.attendance?.joursTravaillesReels ?? input.joursOuvresMois;
  const congesPayes = input.attendance?.congesPayes ?? 0;
  const absencesJustifiees = input.attendance?.absencesJustifiees ?? 0;
  const absencesNonJustifiees = input.attendance?.absencesNonJustifiees ?? 0;
  const joursAbsence = absencesJustifiees + absencesNonJustifiees;

  if (absencesNonJustifiees > 0) {
    anomalies.push({
      code: "ABSENCES_NON_JUSTIFIEES",
      niveau: "AVERTISSEMENT",
      message: `${absencesNonJustifiees} jour(s) d'absence non justifiée(s)`,
      employeeId: employee.id,
    });
  }

  // --- 4. Heures supplémentaires ---
  const heuresSupplementaires = input.attendance?.heuresSupplementaires ?? 0;

  // --- 5. Salaire brut effectif ---
  const salaireBrutEffectif = salaireBrutContractuel * tauxPresence;

  // --- 6. Montant heures supplémentaires ---
  // Taux HS = 1.25× taux horaire (majoration 25% pour les 4 premières heures)
  const heuresMensuelles = input.contractVersion?.heuresMensuelles ?? (input.joursOuvresMois * 8);
  const tauxHoraireBase = heuresMensuelles > 0 ? salaireBrutContractuel / heuresMensuelles : 0;
  const montantHeuresSup = heuresSupplementaires * tauxHoraireBase * 1.25;

  // --- 7. Montant absence (prorata) ---
  const montantAbsence = salaireBrutContractuel > 0 && input.joursOuvresMois > 0
    ? (salaireBrutContractuel / input.joursOuvresMois) * absencesNonJustifiees
    : 0;

  // --- 8. Base imposable ---
  const baseImposable = Math.max(0, salaireBrutEffectif + montantHeuresSup - montantAbsence);

  // --- 9. Cotisations CNSS ---
  const isAgricole = input.clientSecteur === "AGRICOLE";
  const tauxCnssSalarial = isAgricole ? config.cnssSalarialAgricole : config.cnssSalarialNonAgricole;
  const tauxCnssPatronal = isAgricole ? config.cnssPatronalAgricole : config.cnssPatronalNonAgricole;

  // Plafond CNSS mensuel (non agricole) — règle standard tunisienne
  const plafondCnssMensuel = 6000; // DT — plafond CNSS 2026
  const baseCnss = Math.min(baseImposable, plafondCnssMensuel);
  const retenueCnssSalarial = baseCnss * tauxCnssSalarial;
  const retenueCnssPatronal = baseCnss * tauxCnssPatronal;

  // --- 10. CSS ---
  let retenueCss = 0;
  if (config.cssActive && config.cssTaux > 0) {
    // CSS ne s'applique qu'au-delà du seuil d'exonération annuel
    const seuilMensuel = config.cssSeuilExonerationAnnuel / 12;
    if (baseImposable > seuilMensuel) {
      retenueCss = baseImposable * config.cssTaux;
    }
  }

  // --- 11. Total retenues salariales ---
  const totalRetenuesSalariales = retenueCnssSalarial + retenueCss;

  // --- 12. Frais professionnels ---
  const fraisProfessionnels = baseImposable * config.fraisProTauxActifs;
  // Plafond annuel → plafond mensuel
  const plafondFraisProMensuel = config.fraisProPlafondActifsAnnuel / 12;
  const fraisProAppliques = Math.min(fraisProfessionnels, plafondFraisProMensuel);

  // --- 13. Net imposable avant déductions ---
  const netImposableAvantDeductions = Math.max(0, baseImposable - totalRetenuesSalariales - fraisProAppliques);

  // --- 14. Déductions familiales ---
  let deductionChefFamille = 0;
  let deductionEnfants = 0;
  let deductionParents = 0;

  // Chef de famille (marié, veuf ou divorcé)
  if (employee.civilStatus === "MARIE" || employee.civilStatus === "VEUF" || employee.civilStatus === "DIVORCE") {
    deductionChefFamille = config.deductionChefFamille;
  }

  // Enfants
  if (employee.numberOfChildren > 0) {
    const nbEnfants = Math.min(employee.numberOfChildren, config.plafondNombreEnfantsEtudiants);
    deductionEnfants = nbEnfants * config.deductionEnfant;
  }

  // Parents en charge
  if (config.parentsEnChargeActif) {
    const deductionMaxParents = baseImposable * config.parentsEnChargeTaux;
    const plafondParentsMensuel = config.parentsEnChargePlafondParAnnuel / 12;
    deductionParents = Math.min(deductionMaxParents, plafondParentsMensuel);
  }

  const totalDeductionsFamiliales = deductionChefFamille + deductionEnfants + deductionParents;

  // --- 15. Base IRPP ---
  const baseIrpp = Math.max(0, netImposableAvantDeductions - totalDeductionsFamiliales);

  // --- 16. Calcul IRPP (barème progressif) ---
  let retenueIrpp = 0;
  let baseRestante = baseIrpp * 12; // IRPP est annuel

  for (const tranche of input.tranchesIrpp.sort((a, b) => a.ordre - b.ordre)) {
    if (baseRestante <= 0) break;
    const minTranche = tranche.min;
    const maxTranche = tranche.max ?? Infinity;
    const largeurTranche = maxTranche - minTranche;

    if (baseRestante > minTranche) {
      const imposableDansTranche = Math.min(baseRestante, maxTranche) - minTranche;
      retenueIrpp += imposableDansTranche * tranche.taux;
    }
  }

  // Repasser en mensuel
  retenueIrpp = retenueIrpp / 12;

  // --- 17. Salaire net ---
  const salaireNet = Math.max(0, baseImposable - totalRetenuesSalariales - retenueIrpp);

  if (salaireNet <= 0 && baseImposable > 0) {
    anomalies.push({
      code: "SALAIRE_NET_NEGATIF",
      niveau: "BLOQUANTE",
      message: `Salaire net calculé ≤ 0 (${salaireNet.toFixed(3)} DT) — vérifier les retenues`,
      employeeId: employee.id,
    });
  }

  // --- 18. Taux horaire effectif ---
  const tauxHoraire = heuresMensuelles > 0 ? salaireNet / heuresMensuelles : null;

  // Anomalie informationnelle si taux de présence < 100%
  if (tauxPresence < 1 && tauxPresence > 0) {
    anomalies.push({
      code: "PRESENCE_PARTIELLE",
      niveau: "INFORMATION",
      message: `Présence partielle: ${(tauxPresence * 100).toFixed(1)}% — brut effectif: ${salaireBrutEffectif.toFixed(3)} DT`,
      employeeId: employee.id,
    });
  }

  return {
    payslip: {
      salaireBrutContractuel: round2Exact(salaireBrutContractuel),
      tauxPresence,
      joursTravailles,
      joursAbsence,
      heuresSupplementaires,
      salaireBrutEffectif: round2Exact(salaireBrutEffectif),
      montantHeuresSup: round2Exact(montantHeuresSup),
      montantAbsence: round2Exact(montantAbsence),
      baseImposable: round2Exact(baseImposable),
      retenueCnssSalarial: round2Exact(retenueCnssSalarial),
      retenueCss: round2Exact(retenueCss),
      totalRetenuesSalariales: round2Exact(totalRetenuesSalariales),
      retenueCnssPatronal: round2Exact(retenueCnssPatronal),
      fraisProfessionnels: round2Exact(fraisProAppliques),
      netImposableAvantDeductions: round2Exact(netImposableAvantDeductions),
      deductionChefFamille: round2Exact(deductionChefFamille),
      deductionEnfants: round2Exact(deductionEnfants),
      deductionParents: round2Exact(deductionParents),
      totalDeductionsFamiliales: round2Exact(totalDeductionsFamiliales),
      baseIrpp: round2Exact(baseIrpp),
      retenueIrpp: round2Exact(retenueIrpp),
      salaireNet: round2Exact(salaireNet),
      tauxHoraire: tauxHoraire !== null ? round2Exact(tauxHoraire) : null,
    },
    anomalies,
  };
}

// ---------------------------------------------------------------------------
// Calcul en masse — tous les salariés actifs d'un client pour une période
// ---------------------------------------------------------------------------

export interface MassPayrollInput {
  periodId: string;
  workspaceId: string;
  clientCompanyId: string;
  mois: number;
  annee: number;
  calculatedBy: string;
}

export interface MassPayrollResult {
  bulletinsCreated: number;
  anomaliesCreated: number;
  skippedNoContract: number;
  skippedNoAttendance: number;
  errors: string[];
}

export async function calculateMassPayroll(input: MassPayrollInput): Promise<MassPayrollResult> {
  const result: MassPayrollResult = {
    bulletinsCreated: 0,
    anomaliesCreated: 0,
    skippedNoContract: 0,
    skippedNoAttendance: 0,
    errors: [],
  };

  const dateCalcul = new Date();

  // 1. Récupérer les salariés actifs du client
  const employees = await prisma.employees.findMany({
    where: {
      clientCompanyId: input.clientCompanyId,
      isActive: true,
      departedAt: null,
    },
  });

  if (employees.length === 0) {
    result.errors.push("Aucun salarié actif trouvé pour ce client");
    return result;
  }

  // 2. Récupérer la config paie du workspace
  const payrollConfig = await prisma.payrollConfig.findUnique({
    where: { workspaceId: input.workspaceId },
    include: { tranches_irpp: { orderBy: { ordre: "asc" } } },
  });

  if (!payrollConfig) {
    result.errors.push("Configuration paie introuvable pour ce workspace");
    return result;
  }

  // 3. Récupérer le client pour son secteur
  const client = await prisma.clientCompany.findUnique({
    where: { id: input.clientCompanyId },
  });

  if (!client) {
    result.errors.push("Entreprise cliente introuvable");
    return result;
  }

  // 4. Jours ouvrés du mois
  const joursOuvresMois = getJoursOuvresMois(input.mois, input.annee);

  // 5. Récupérer les règles réglementaires actives à la date de calcul
  // (On utilise les valeurs du PayrollConfig par défaut, mais les règles
  //  RegleReglementaire peuvent les surcharger si présentes)

  // 6. Récupérer le pointage validé pour ce mois/année
  const validatedImports = await prisma.attendanceImport.findMany({
    where: {
      clientCompanyId: input.clientCompanyId,
      workspaceId: input.workspaceId,
      mois: input.mois,
      annee: input.annee,
      statut: { in: ["VALIDE", "ANOMALIES"] },
    },
    include: {
      summaries: {
        include: {
          employee: true,
          variables: {
            where: { statut: "VALIDEE" },
          },
        },
      },
    },
  });

  // Index des pointages par employeeId
  const attendanceByEmployee = new Map<string, typeof validatedImports[0]["summaries"][0]>();
  for (const imp of validatedImports) {
    for (const summary of imp.summaries) {
      attendanceByEmployee.set(summary.employeeId, summary);
    }
  }

  // 6-F (réévaluation) : cache conventions (code/nom) pour les messages
  // d'anomalie de grille — évite un N+1 quand plusieurs salariés partagent
  // la même convention collective.
  const conventionCache = new Map<string, { code: string; nom: string } | null>();

  // 7. Pour chaque salarié, calculer le bulletin
  for (const employee of employees) {
    try {
      // Contrat actif à la date de calcul
      const contract = await prisma.contract.findFirst({
        where: {
          employeeId: employee.id,
          statut: "ACTIF",
        },
        include: {
          versions: {
            where: { dateEffet: { lte: dateCalcul } },
            orderBy: { dateEffet: "desc" },
            take: 1,
          },
        },
      });

      if (!contract || contract.versions.length === 0) {
        result.skippedNoContract++;
        // Créer anomalie
        await prisma.anomaly.create({
          data: {
            periodId: input.periodId,
            employeeId: employee.id,
            workspaceId: input.workspaceId,
            code: "CONTRAT_MANQUANT",
            niveau: "BLOQUANTE",
            message: `Aucun contrat actif trouvé pour ${employee.firstName} ${employee.lastName}`,
          },
        });
        result.anomaliesCreated++;
        continue;
      }

      const contractVersion = contract.versions[0];

      // ── 6-F (réévaluation) : liaison conventions collectives → moteur ──
      // Le contrat ou sa version peuvent référencer une convention. Si la
      // grille salariale de cette convention définit un minimum pour le
      // couple (coefficient, échelon) en vigueur à la date de calcul, un
      // salaire inférieur est signalé en AVERTISSEMENT — NON bloquant :
      // le moteur n'impose pas de montant, il informe (la régularisation
      // appartient à l'employeur/négociation). Jusqu'ici les conventions
      // étaient une fonction orpheline : aucune référence dans la paie.
      const conventionId = contractVersion.conventionCollectiveId ?? contract.conventionCollectiveId;
      if (conventionId && contractVersion.coefficient && contractVersion.echelon) {
        const dateFinMoisPaie = new Date(Date.UTC(input.annee, input.mois, 0)); // dernier jour du mois de paie
        const grille = await prisma.conventionGrilleSalariale.findFirst({
          where: {
            conventionCollectiveId: conventionId,
            coefficient: contractVersion.coefficient,
            echelon: contractVersion.echelon,
            dateEffet: { lte: dateCalcul },
            OR: [{ dateFin: null }, { dateFin: { gte: dateFinMoisPaie } }],
          },
          orderBy: { dateEffet: "desc" },
        });
        if (grille && contractVersion.salaireBrut < grille.salaireMinimum) {
          if (!conventionCache.has(conventionId)) {
            conventionCache.set(
              conventionId,
              await prisma.conventionCollective.findUnique({
                where: { id: conventionId },
                select: { code: true, nom: true },
              }),
            );
          }
          const conv = conventionCache.get(conventionId);
          await prisma.anomaly.create({
            data: {
              periodId: input.periodId,
              employeeId: employee.id,
              workspaceId: input.workspaceId,
              code: "SALAIRE_SOUS_GRILLE",
              niveau: "AVERTISSEMENT",
              message: `Salaire brut (${contractVersion.salaireBrut.toFixed(3)} DT) inférieur au minimum conventionnel (${grille.salaireMinimum.toFixed(3)} DT) — ${conv ? `convention ${conv.code} ${conv.nom}, ` : ""}coefficient ${contractVersion.coefficient}, échelon ${contractVersion.echelon}`,
            },
          });
          result.anomaliesCreated++;
        }
      }

      // Pointage
      const attendance = attendanceByEmployee.get(employee.id);

      // Construire l'input du moteur
      const payrollInput: PayrollInput = {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          matriculeCnss: employee.matriculeCnss,
          civilStatus: employee.civilStatus,
          numberOfChildren: employee.numberOfChildren,
          baseSalary: employee.baseSalary,
          clientCompanyId: employee.clientCompanyId,
        },
        contractVersion: {
          id: contractVersion.id,
          salaireBrut: contractVersion.salaireBrut,
          heuresHebdomadaires: contractVersion.heuresHebdomadaires,
          heuresMensuelles: contractVersion.heuresMensuelles,
          coefficient: contractVersion.coefficient,
          echelon: contractVersion.echelon,
        },
        attendance: attendance ? {
          joursTravaillesReels: attendance.joursTravaillesReels,
          congesPayes: attendance.congesPayes,
          absencesJustifiees: attendance.absencesJustifiees,
          absencesNonJustifiees: attendance.absencesNonJustifiees,
          heuresSupplementaires: attendance.heuresSupplementaires,
          joursOuvresTotal: attendance.joursOuvresTotal,
          tauxPresence: attendance.tauxPresence,
        } : null,
        payrollConfig: {
          cnssSalarialNonAgricole: payrollConfig.cnssSalarialNonAgricole,
          cnssPatronalNonAgricole: payrollConfig.cnssPatronalNonAgricole,
          cnssSalarialAgricole: payrollConfig.cnssSalarialAgricole,
          cnssPatronalAgricole: payrollConfig.cnssPatronalAgricole,
          cssActive: payrollConfig.cssActive,
          cssTaux: payrollConfig.cssTaux,
          cssSeuilExonerationAnnuel: payrollConfig.cssSeuilExonerationAnnuel,
          fraisProTauxActifs: payrollConfig.fraisProTauxActifs,
          fraisProPlafondActifsAnnuel: payrollConfig.fraisProPlafondActifsAnnuel,
          fraisProTauxRetraites: payrollConfig.fraisProTauxRetraites,
          deductionChefFamille: payrollConfig.deductionChefFamille,
          deductionEnfant: payrollConfig.deductionEnfant,
          deductionEtudiant: payrollConfig.deductionEtudiant,
          plafondNombreEnfantsEtudiants: payrollConfig.plafondNombreEnfantsEtudiants,
          deductionInfirme: payrollConfig.deductionInfirme,
          parentsEnChargeActif: payrollConfig.parentsEnChargeActif,
          parentsEnChargeTaux: payrollConfig.parentsEnChargeTaux,
          parentsEnChargePlafondParAnnuel: payrollConfig.parentsEnChargePlafondParAnnuel,
          secteur: client.secteur,
        },
        tranchesIrpp: payrollConfig.tranches_irpp.map(t => ({
          min: t.min,
          max: t.max,
          taux: t.taux,
          ordre: t.ordre,
        })),
        clientSecteur: client.secteur,
        joursOuvresMois,
      };

      // Calcul
      const { payslip, anomalies: calcAnomalies } = calculatePayroll(payrollInput);

      // Créer le bulletin
      const payslipRecord = await prisma.payslip.create({
        data: {
          periodId: input.periodId,
          employeeId: employee.id,
          workspaceId: input.workspaceId,
          clientCompanyId: input.clientCompanyId,
          mois: input.mois,
          annee: input.annee,
          matricule: employee.matriculeCnss,
          nomPrenom: `${employee.firstName} ${employee.lastName}`,
          contratId: contract.id,
          salaireBrutContractuel: payslip.salaireBrutContractuel,
          tauxPresence: payslip.tauxPresence,
          joursTravailles: payslip.joursTravailles,
          joursAbsence: payslip.joursAbsence,
          heuresSupplementaires: payslip.heuresSupplementaires,
          salaireBrutEffectif: payslip.salaireBrutEffectif,
          montantHeuresSup: payslip.montantHeuresSup,
          montantAbsence: payslip.montantAbsence,
          baseImposable: payslip.baseImposable,
          retenueCnssSalarial: payslip.retenueCnssSalarial,
          retenueCss: payslip.retenueCss,
          totalRetenuesSalariales: payslip.totalRetenuesSalariales,
          retenueCnssPatronal: payslip.retenueCnssPatronal,
          fraisProfessionnels: payslip.fraisProfessionnels,
          netImposableAvantDeductions: payslip.netImposableAvantDeductions,
          deductionChefFamille: payslip.deductionChefFamille,
          deductionEnfants: payslip.deductionEnfants,
          deductionParents: payslip.deductionParents,
          totalDeductionsFamiliales: payslip.totalDeductionsFamiliales,
          baseIrpp: payslip.baseIrpp,
          retenueIrpp: payslip.retenueIrpp,
          salaireNet: payslip.salaireNet,
          tauxHoraire: payslip.tauxHoraire,
          calculatedAt: dateCalcul,
        },
      });

      result.bulletinsCreated++;

      // Créer les anomalies du calcul
      for (const an of calcAnomalies) {
        await prisma.anomaly.create({
          data: {
            periodId: input.periodId,
            payslipId: payslipRecord.id,
            employeeId: an.employeeId || employee.id,
            workspaceId: input.workspaceId,
            code: an.code,
            niveau: an.niveau,
            message: an.message,
          },
        });
        result.anomaliesCreated++;
      }

    } catch (err) {
      result.errors.push(`Erreur calcul ${employee.firstName} ${employee.lastName}: ${(err as Error).message}`);
    }
  }

  // 8. Mettre à jour la période
  const hasBloquantes = result.anomaliesCreated > 0; // Simplified — check actual bloquantes
  const actualBloquantes = await prisma.anomaly.count({
    where: { periodId: input.periodId, niveau: "BLOQUANTE", estResolue: false },
  });

  await prisma.payrollPeriod.update({
    where: { id: input.periodId },
    data: {
      statut: actualBloquantes > 0 ? "CALCULATED" : "CALCULATED", // Always CALCULATED after compute
      dateCalcul,
      calculatedBy: input.calculatedBy,
      nombreSalaries: employees.length,
      nombreBulletins: result.bulletinsCreated,
      nombreAnomalies: result.anomaliesCreated,
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/** Jours ouvrés approximatifs par mois (lundi-samedi en Tunisie) */
export function getJoursOuvresMois(mois: number, annee: number): number {
  const premierJour = new Date(annee, mois - 1, 1);
  const dernierJour = new Date(annee, mois, 0);
  let joursOuvres = 0;

  for (let d = new Date(premierJour); d <= dernierJour; d.setDate(d.getDate() + 1)) {
    const jour = d.getDay();
    // Lundi(1) à Samedi(6) = ouvré, Dimanche(0) = repos
    if (jour >= 1 && jour <= 6) {
      joursOuvres++;
    }
  }

  return joursOuvres;
}
