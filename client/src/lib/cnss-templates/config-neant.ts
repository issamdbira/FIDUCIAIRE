// Configuration pour les formulaires CNSS
export const NEANT_CONFIG = {
  // 1. État Récapitulatif (I3)
  I3: {
    templatePath: '/templates-cnss/I3.pdf',
    fields: {
      employeurNum: { x: 150, y: 720 },
      trimestre: { x: 400, y: 720 },
      annee: { x: 450, y: 720 },
      totalSalaires: { x: 300, y: 500, default: '0,000' },
      totalCotisations: { x: 450, y: 500, default: '0,000' },
      mentionNeant: { x: 200, y: 400, default: 'NÉANT', size: 48 }, 
    }
  },
  
  // 2. Déclaration Trimestrielle détaillée (I16)
  I16: {
    templatePath: '/templates-cnss/I16.pdf',
    fields: {
      employeurNum: { x: 150, y: 720 },
      mentionNeant: { x: 250, y: 450, default: 'NÉANT', size: 64 },
    },
    lines: [
      { startX: 50, startY: 600, endX: 550, endY: 200, thickness: 2 }
    ]
  },

  // 3. Demande d'immatriculation (N45)
  N45: {
    templatePath: '/templates-cnss/N45.pdf',
    fields: {
      employeurNum: { x: 150, y: 700 },
      employeurNom: { x: 150, y: 680 },
      salarieNom: { x: 150, y: 500 },
      salariePrenom: { x: 150, y: 480 },
    }
  }
};
