import type { CategoriaGasto } from "../services/gastosApi"

// Por qué no vale un importe. Se admiten hasta diez cifras enteras y dos decimales, con coma o con punto,
// como numeric(12,2) en la base de datos
export const MENSAJES_IMPORTE = {
  vacio: "Escribe el importe del gasto",
  negativo: "El importe no puede ser negativo",
  formato: "Escribe solo números, con coma o punto para los decimales",
  decimales: "Como máximo dos decimales",
  maximo: "El importe máximo es 9.999.999.999,99 €",
  cero: "El importe tiene que ser mayor que 0",
  incompleto: "Escribe los decimales después de la coma",
} as const

type MotivoImporte = keyof typeof MENSAJES_IMPORTE

// Cifras enteras y, si hay coma o punto, lo que va detrás (puede estar vacío mientras se escribe)
const CIFRAS_REGEX = /^(\d+)(?:[.,](\d*))?$/

const motivoDelImporte = (texto: string): MotivoImporte | null => {
  const limpio = texto.trim()
  if (limpio === "") return "vacio"
  if (limpio.startsWith("-")) return "negativo"
  const cifras = CIFRAS_REGEX.exec(limpio)
  if (!cifras) return "formato"
  const [, enteros, decimales = ""] = cifras
  if (decimales.length > 2) return "decimales"
  if (enteros.length > 10) return "maximo"
  if (Number(limpio.replace(",", ".")) === 0) return "cero"
  // Hay coma o punto pero nada detrás: "12,"
  if (decimales === "" && limpio.length > enteros.length) return "incompleto"
  return null
}

// Motivo por el que el importe no vale, o "" si vale
export const validarImporte = (texto: string) => {
  const motivo = motivoDelImporte(texto)
  return motivo ? MENSAJES_IMPORTE[motivo] : ""
}

// Mientras se escribe solo se avisa de lo que no se arregla escribiendo más: vacío, 0 o "12," pueden
// ser el principio de un importe válido, así que esos avisos esperan a salir del campo o a enviar
const MOTIVOS_A_MEDIAS: MotivoImporte[] = ["vacio", "cero", "incompleto"]
export const avisoAlEscribirImporte = (texto: string) => {
  const motivo = motivoDelImporte(texto)
  return motivo && !MOTIVOS_A_MEDIAS.includes(motivo) ? MENSAJES_IMPORTE[motivo] : ""
}

// "12,5" → 12.5. Devuelve null si no es un importe válido mayor que 0
export const leerImporte = (texto: string) =>
  motivoDelImporte(texto) ? null : Number(texto.trim().replace(",", "."))

// Reparto a partes iguales en céntimos, igual que el backend: los céntimos que sobran van uno a uno
// a los primeros participantes, así que las partes siempre suman el importe (10 € entre 3: 3,34 + 3,33 + 3,33)
export const repartirAPartesIguales = (importe: number, participantes: number) => {
  const centimos = Math.round(importe * 100)
  const base = Math.floor(centimos / participantes)
  const sobran = centimos % participantes
  return Array.from({ length: participantes }, (_, i) => (base + (i < sobran ? 1 : 0)) / 100)
}

// 3.5 → "3,50 €"; 1234567.8 → "1.234.567,80 €". Los miles se separan a mano porque Intl en español
// no separa los números de cuatro cifras (1234,00 €)
export const conEuros = (cantidad: number) => {
  const fijo = cantidad.toFixed(2)
  const negativo = fijo.startsWith("-")
  const [enteros, decimales] = (negativo ? fijo.slice(1) : fijo).split(".")
  const grupos: string[] = []
  for (let fin = enteros.length; fin > 0; fin -= 3) grupos.unshift(enteros.slice(Math.max(0, fin - 3), fin))
  return `${negativo ? "-" : ""}${grupos.join(".")},${decimales} €`
}

// Tamaño de letra para que las cifras largas quepan: hasta `desde` caracteres es `grande`, a partir de
// `hasta` es `pequeno` y entre medias encoge poco a poco
export const tamanoSegunLongitud = (longitud: number, grande: number, pequeno: number, desde: number, hasta: number) => {
  if (longitud <= desde) return grande
  if (longitud >= hasta) return pequeno
  return Math.round(grande - ((grande - pequeno) * (longitud - desde)) / (hasta - desde))
}

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

export const conSigno = (cantidad: number) => `${cantidad > 0 ? "+" : ""}${conEuros(cantidad)}`

// Cómo queda un miembro según su saldo, con el color con el que se muestra
export const estadoDelSaldo = (saldo: number) => {
  if (saldo > 0) return { texto: "Te deben", color: "green" as const }
  if (saldo < 0) return { texto: "Debes", color: "accent" as const }
  return { texto: "Al día", color: "muted" as const }
}
