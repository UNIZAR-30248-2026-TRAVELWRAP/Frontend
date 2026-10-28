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
