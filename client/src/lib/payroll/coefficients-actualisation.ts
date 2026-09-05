/**
 * Coefficients d'actualisation des salaires CNSS — table complète 1961-2029.
 * SOURCE UNIQUE pour le calculateur d'actualisation ET le calculateur de
 * retraite (ne pas dupliquer cette table ailleurs).
 *
 * Ces coefficients servent à réévaluer un salaire perçu une année donnée
 * en valeur actuelle pour le calcul du salaire de référence de la pension
 * de retraite (moyenne des 10 dernières années de salaire, actualisées).
 *
 * Coefficients à 1 pour 2023-2029 : aucune actualisation nécessaire pour
 * les années les plus récentes (base de référence).
 */
export const COEFFICIENTS_ACTUALISATION: Record<number, number> = {
  2029: 1,
  2028: 1,
  2027: 1,
  2026: 1,
  2025: 1,
  2024: 1,
  2023: 1,
  2022: 1.09323,
  2021: 1.18406,
  2020: 1.25163,
  2019: 1.32216,
  2018: 1.41201,
  2017: 1.51728,
  2016: 1.59801,
  2015: 1.65757,
  2014: 1.73581,
  2013: 1.831,
  2012: 1.94286,
  2011: 2.05086,
  2010: 2.12348,
  2009: 2.2171,
  2008: 2.29536,
  2007: 2.40815,
  2006: 2.49094,
  2005: 2.59414,
  2004: 2.64698,
  2003: 2.74283,
  2002: 2.81754,
  2001: 2.89716,
  2000: 2.95357,
  1999: 3.03922,
  1998: 3.12158,
  1997: 3.2191,
  1996: 3.33821,
  1995: 3.46189,
  1994: 3.67829,
  1993: 3.84271,
  1992: 4.00399,
  1991: 4.22717,
  1990: 4.55478,
  1989: 4.85471,
  1988: 5.22945,
  1987: 5.60461,
  1986: 6.06452,
  1985: 6.44386,
  1984: 6.92444,
  1983: 7.51994,
  1982: 8.23652,
  1981: 9.39581,
  1980: 10.26934,
  1979: 11.18475,
  1978: 12.12539,
  1977: 12.80647,
  1976: 13.66348,
  1975: 14.39612,
  1974: 15.76533,
  1973: 16.40729,
  1972: 17.14398,
  1971: 17.50589,
  1970: 18.55677,
  1969: 18.75626,
  1968: 19.50539,
  1967: 20.01038,
  1966: 20.60829,
  1965: 21.40295,
  1964: 22.82518,
  1963: 23.77882,
  1962: 24.42085,
  1961: 24.91928,
};

/** Retourne le coefficient de l'année, ou 1 par défaut si l'année n'est pas couverte par la table. */
export function getCoefficientActualisation(annee: number): number {
  return COEFFICIENTS_ACTUALISATION[annee] ?? 1;
}
