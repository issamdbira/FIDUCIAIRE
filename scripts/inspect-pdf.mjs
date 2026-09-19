// Quick script to inspect the PDF binary
import { generateBulletinPdf } from "../server/lib/document-generator.js";

const pdf = await generateBulletinPdf({
  id: "psl-1", mois: 9, annee: 2026, matricule: "12345678", nomPrenom: "Ali Ben Test",
  salaireBrutContractuel: 1500, tauxPresence: 1, joursTravailles: 22, joursAbsence: 0,
  heuresSupplementaires: 0, salaireBrutEffectif: 1500, montantHeuresSup: 0, montantAbsence: 0,
  baseImposable: 1500, retenueCnssSalarial: 145.2, retenueCss: 0, totalRetenuesSalariales: 145.2,
  retenueCnssPatronal: 256.05, fraisProfessionnels: 150, netImposableAvantDeductions: 1204.8,
  deductionChefFamille: 0, deductionEnfants: 0, deductionParents: 0, totalDeductionsFamiliales: 0,
  baseIrpp: 1204.8, retenueIrpp: 155.37, salaireNet: 1199.43, tauxHoraire: 7.21,
}, { raisonSociale: "Test SARL", matriculeFiscal: "MF-123", matriculeCnss: "12345678" });

const content = pdf.toString("latin1");
console.log("Length:", pdf.length);
console.log("Has %PDF:", content.startsWith("%PDF"));
console.log("Has %%EOF:", content.slice(-10).includes("%%EOF"));
console.log("Has 'Ali Ben Test' (in metadata?):", content.includes("Ali Ben Test"));
console.log("Has '/Title':", content.includes("/Title"));
console.log("Has 'Bulletin':", content.includes("Bulletin"));
console.log("Has 'NET':", content.includes("NET"));
console.log("Has 'Test SARL':", content.includes("Test SARL"));
