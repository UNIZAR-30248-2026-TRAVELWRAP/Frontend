// Formato de fechas, importes y miembros de los viajes, compartido por las pantallas que los muestran
import type { Miembro } from "../components/Avatar"
import { C } from "../styles/tokens"

const COLORES_MIEMBROS = [C.blue, C.green, C.accent, "#805AD5", C.red]
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const SIMBOLOS_MONEDA: Record<string, string> = { EUR: "€" }

// "2027-05-12" → { dia: 12, mes: 4, anio: 2027 }, sin pasar por zonas horarias
const leerFecha = (texto: string) => {
  const [anio, mes, dia] = texto.split("-").map(Number)
  return { anio, mes: mes - 1, dia }
}

const diasEntre = (inicio: string, fin: string) => {
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  return Math.round((Date.UTC(b.anio, b.mes, b.dia) - Date.UTC(a.anio, a.mes, a.dia)) / 86400000) + 1
}

const fechaCorta = (texto: string, conAnio = false) => {
  const { dia, mes, anio } = leerFecha(texto)
  return `${dia} ${MESES[mes]}${conAnio ? ` ${anio}` : ""}`
}

export const diasDelViaje = (inicio: string, fin: string) => {
  const a = leerFecha(inicio)
  const total = Math.max(diasEntre(inicio, fin), 0)
  return Array.from({ length: total }, (_, i) => {
    const fecha = new Date(Date.UTC(a.anio, a.mes, a.dia + i))
    const iso = fecha.toISOString().slice(0, 10)
    return { fecha: iso, texto: `Día ${i + 1} · ${fechaCorta(iso)}` }
  })
}

// Viaje activo: "12 – 15 may · 4 días"
export const formatearFechasActivo = (inicio: string | null, fin: string | null) => {
  if (!inicio && !fin) return "Fechas por confirmar"
  if (!inicio || !fin) return fechaCorta((inicio ?? fin) as string, true)
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  const rango =
    a.mes === b.mes && a.anio === b.anio
      ? `${a.dia} – ${b.dia} ${MESES[b.mes]}`
      : `${fechaCorta(inicio)} – ${fechaCorta(fin)}`
  const dias = diasEntre(inicio, fin)
  return `${rango} · ${dias} ${dias === 1 ? "día" : "días"}`
}

// Viaje anterior: "20–24 jun 2024"
export const formatearFechasAnterior = (inicio: string | null, fin: string | null) => {
  if (!inicio && !fin) return "Fechas sin indicar"
  if (!inicio || !fin) return fechaCorta((inicio ?? fin) as string, true)
  const a = leerFecha(inicio)
  const b = leerFecha(fin)
  if (a.anio !== b.anio) return `${fechaCorta(inicio, true)} – ${fechaCorta(fin, true)}`
  if (a.mes !== b.mes) return `${fechaCorta(inicio)} – ${fechaCorta(fin)} ${b.anio}`
  return `${a.dia}–${b.dia} ${MESES[b.mes]} ${b.anio}`
}

// 1240 → "1.240 €"
export const formatearImporte = (cantidad: number, moneda = "EUR") => {
  const entero = Math.round(cantidad)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${entero} ${SIMBOLOS_MONEDA[moneda] ?? moneda}`
}

// Miembro del viaje → avatar con su inicial y un color según su posición
export const aMiembro = (nombre: string | null, indice: number): Miembro => {
  const texto = nombre?.trim() || "?"
  return {
    name: texto,
    initial: texto.charAt(0).toUpperCase(),
    color: COLORES_MIEMBROS[indice % COLORES_MIEMBROS.length],
  }
}
