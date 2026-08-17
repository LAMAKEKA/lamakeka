export const CATEGORIAS_BOVINOS = [
  "Terneros",
  "Terneras",
  "Novillos",
  "Novillitos",
  "Vacas",
  "Vaquillonas",
  "Toros",
] as const;

export const MOTIVOS_DECLARACION = [
  "Acta de vacunación aftosa",
  "Novedad por nacimiento",
  "Reinscripción anual RENSPA",
] as const;

export type CategoriaBovino = (typeof CATEGORIAS_BOVINOS)[number];
export type MotivoDeclaracion = (typeof MOTIVOS_DECLARACION)[number];
