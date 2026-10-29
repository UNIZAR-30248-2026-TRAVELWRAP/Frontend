import type { CategoriaGasto } from "../services/gastosApi"

// Hasta diez cifras enteras y dos decimales, con coma o con punto: numeric(12,2) en la base de datos
const IMPORTE_REGEX = /^\d{1,10}([.,]\d{1,2})?$/

// "12,5" → 12.5. Devuelve null si no es un importe válido mayor que 0
export const leerImporte = (texto: string) => {
  const limpio = texto.trim()
  if (!IMPORTE_REGEX.test(limpio)) return null
  const importe = Number(limpio.replace(",", "."))
  return importe > 0 ? importe : null
}

// Reparto a partes iguales en céntimos, igual que el backend: los céntimos que sobran van uno a uno
// a los primeros participantes, así que las partes siempre suman el importe (10 € entre 3: 3,34 + 3,33 + 3,33)
export const repartirAPartesIguales = (importe: number, participantes: number) => {
  const centimos = Math.round(importe * 100)
  const base = Math.floor(centimos / participantes)
  const sobran = centimos % participantes
  return Array.from({ length: participantes }, (_, i) => (base + (i < sobran ? 1 : 0)) / 100)
}

// 3.5 → "3,50 €"
export const conEuros = (cantidad: number) => `${cantidad.toFixed(2).replace(".", ",")} €`

// Categorías de gasto con su icono, en el orden del prototipo
export const CATEGORIAS_GASTO: { categoria: CategoriaGasto; icono: string; texto: string }[] = [
  { categoria: "comida", icono: "restaurant", texto: "Comida" },
  { categoria: "transporte", icono: "flight", texto: "Transporte" },
  { categoria: "entradas", icono: "ticket", texto: "Entradas" },
  { categoria: "alojamiento", icono: "house", texto: "Alojamiento" },
  { categoria: "ocio", icono: "gallery", texto: "Ocio" },
  { categoria: "otros", icono: "document", texto: "Otros" },
]

export const iconoDeCategoriaGasto = (categoria: CategoriaGasto) =>
  CATEGORIAS_GASTO.find((c) => c.categoria === categoria)?.icono ?? "document"

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

// "2027-05-12" → "12 may"
export const fechaDelGasto = (fecha: string) => {
  const [, mes, dia] = fecha.split("-").map(Number)
  return `${dia} ${MESES[mes - 1]}`
}
