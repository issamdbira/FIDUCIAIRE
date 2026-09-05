export interface RisqueDeclaration {
  code: string;
  libelle: string;
  gravite: "critique" | "moyenne" | "faible";
  description: string;
}

export const RISQUES_DECLARATIONS_GENERALES: RisqueDeclaration[] = [
  {
    code: "ERR-001",
    libelle: "Matricule employeur invalide",
    gravite: "critique",
    description:
      "Le matricule de l'employeur ne respecte pas le format attendu (8 chiffres + 2 chiffres de clé).",
  },
  {
    code: "ERR-002",
    libelle: "Total des salaires déclaré à zéro",
    gravite: "moyenne",
    description:
      "Le total trimestriel des salaires déclarés est nul. Si l'entreprise a des salariés actifs, cela peut indiquer une omission.",
  },
  {
    code: "ERR-003",
    libelle: "Écart significatif entre trimestres",
    gravite: "moyenne",
    description:
      "Le nombre de salariés déclarés ou la masse salariale varie de plus de 50% par rapport au trimestre précédent.",
  },
  {
    code: "ERR-004",
    libelle: "Code d'exploitation manquant",
    gravite: "faible",
    description:
      "Le code d'exploitation de l'établissement n'est pas renseigné sur la déclaration trimestrielle.",
  },
  {
    code: "ERR-005",
    libelle: "Nombre de pages incohérent",
    gravite: "faible",
    description:
      "Le numéro de page final ne correspond pas au nombre de pages attendu pour le volume de salariés déclarés.",
  },
];

export interface DeclarationInput {
  matriculeEmployeur: string;
  totalSalaires: number;
  nombreSalaries: number;
  nombreSalariesTrimPrecedent?: number;
  totalSalairesTrimPrecedent?: number;
  codeExploitationPresent: boolean;
  nombrePages: number;
  nombreSalariesDeclare: number;
}

export function evaluerRisquesDeclaration(declaration: DeclarationInput): RisqueDeclaration[] {
  const risques: RisqueDeclaration[] = [];

  if (!/^\d{8}-\d{2}$/.test(declaration.matriculeEmployeur)) {
    risques.push(RISQUES_DECLARATIONS_GENERALES[0]);
  }

  if (declaration.nombreSalaries > 0 && declaration.totalSalaires === 0) {
    risques.push(RISQUES_DECLARATIONS_GENERALES[1]);
  }

  if (
    declaration.nombreSalariesTrimPrecedent !== undefined &&
    declaration.nombreSalariesTrimPrecedent > 0
  ) {
    const variation =
      Math.abs(
        (declaration.nombreSalaries - declaration.nombreSalariesTrimPrecedent) /
          declaration.nombreSalariesTrimPrecedent
      );
    if (variation > 0.5) {
      risques.push(RISQUES_DECLARATIONS_GENERALES[2]);
    }
  }

  if (!declaration.codeExploitationPresent) {
    risques.push(RISQUES_DECLARATIONS_GENERALES[3]);
  }

  const expectedPages = Math.max(1, Math.ceil(declaration.nombreSalariesDeclare / 12));
  if (declaration.nombrePages !== expectedPages && declaration.nombreSalariesDeclare > 0) {
    risques.push(RISQUES_DECLARATIONS_GENERALES[4]);
  }

  return risques;
}
