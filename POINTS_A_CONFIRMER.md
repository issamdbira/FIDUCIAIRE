# Points à confirmer — Avantages exclus (Décret n° 2003-1098)

Ce document recense les points du décret dont l'intégration au moteur de
calcul nécessite une confirmation réglementaire ou une interprétation
juridique. Le moteur implémente une logique prudente (exonération totale
sous réserve de respect de la condition légale), mais certains cas
méritent une validation par un expert en droit social tunisien.

## Points qualitatifs sans plafond SMIG (montant déclaré manuellement)

| Point | Titre | Ambiguïté / Question |
|-------|-------|---------------------|
| 3 | Prime de colonie de vacances | Le plafond est « dans la limite des montants octroyés par la CNSS » — quel barème CNSS exact utiliser ? Le montant varie selon le type de prestation. |
| 6 | Cadeaux — mise à la retraite | Plafond = 3 mensualités du salaire de **l'agent concerné** (pas du SMIG) — le moteur ne peut pas déterminer le salaire individuel. L'employeur doit le déclarer manuellement. |
| 9 | Aide — événement malheureux ou décès | Le décret ne fixe **aucun plafond chiffré** (contrairement aux points 7 et 8). Exclusion totale ou plafonnée ? Pratique CNSS à vérifier. |
| 12 | Frais de mission (intérieur) | Conditionné à la présentation d'un **ordre de mission** — le moteur ne peut pas vérifier ce justificatif. L'employeur déclare sous sa responsabilité. |
| 19 | Missions temporaires (autre régime) | Limite en **heures** (10h ou 3h/semaine), pas en montant — comment convertir en plafond monétaire ? Nécessite le taux horaire de l'agent. |
| 22 | Étudiants stagiaires | Référence relative aux montants des « stagiaires homologues » — notion non chiffrée par le décret. |

## Points exclus du plafond global 5% (art. 3)

Les points suivants sont **exclus du plafond de 5%** de la masse salariale
(art. 3 du décret). Ils sont déclarés comme avantages exclus sans être
comptabilisés dans le contrôle du plafond global :

- **Point 16** : Indemnités culturelles, sportives ou de loisirs
- **Point 17** : Missions à l'étranger (excédent de salaire)
- **Point 18** : Primes d'assurance collective (employeur)
- **Point 19** : Missions temporaires (autre régime)
- **Point 23** : Gratifications de fin de service (excédent)
- **Point 24** : Dommages et intérêts judiciaires

## Plafond global 5% (art. 3) — Règle implémentée

Le moteur vérifie désormais que :

> Σ(avantages exclus des points 1–15, 20–22) ≤ 5% × masse salariale brute

En cas de dépassement, l'excédent est **réintégré** dans l'assiette des
cotisations CNSS et de l'IRPP. Les points 16, 17, 18, 19, 23, 24 ne sont
pas comptés dans ce plafond.

## Recommendations pour la validation

1. **Consulter la CNSS** : confirmer l'interprétation du plafond global 5%
   (calcul individuel par salarié vs. global par entreprise).
2. **Point 9** : vérifier auprès d'un expert si l'exclusion est totale ou
   s'il existe un plafond pratique non écrit dans le décret.
3. **Point 19** : déterminer comment convertir la limite horaire en plafond
   monétaire pour les besoins du moteur de calcul.
4. **Point 6** : documenter le mode de déclaration du salaire individuel
   de l'agent pour le calcul des 3 mensualités.
