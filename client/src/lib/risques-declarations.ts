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
      "Le matricule de l'employeur ne respecte pas le format attendu (8 chiffres + 2 chiffres de cl\u00e9).",
  },
  {
    code: "ERR-002",
    libelle: "Total des salaires d\u00e9clar\u00e9 \u00e0 z\u00e9ro",
    gravite: "moyenne",
    description:
      "Le total trimestriel des salaires d\u00e9clar\u00e9s est nul. Si l'entreprise a des salari\u00e9s actifs, cela peut indiquer une omission.",
  },
  {
    code: "ERR-003",
    libelle: "\u00c9cart significatif entre trimestres",
    gravite: "moyenne",
    description:
      "Le nombre de salari\u00e9s d\u00e9clar\u00e9s ou la masse salariale varie de plus de 50% par rapport au trimestre pr\u00e9c\u00e9dent.",
  },
  {
    code: "ERR-004",
    libelle: "Code d'exploitation manquant",
    gravite: "faible",
    description:
      "Le code d'exploitation de l'\u00e9tablissement n'est pas renseign\u00e9 sur la d\u00e9claration trimestrielle.",
  },
  {
    code: "ERR-005",
    libelle: "Nombre de pages incoh\u00e9rent",
    gravite: "faible",
    description:
      "Le num\u00e9ro de page final ne correspond pas au nombre de pages attendu pour le volume de salari\u00e9s d\u00e9clar\u00e9s.",
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
