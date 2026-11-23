import type { Actividad } from "../services/actividadesApi"

// Actividad en curso y próxima de un viaje, según la hora de inicio y de fin de cada actividad.
// Son funciones puras: reciben el momento actual para poder probarlas con cualquier hora.

type ActividadConHora = Pick<Actividad, "fecha" | "hora_inicio" | "hora_fin" | "orden">

const dos = (numero: number) => String(numero).padStart(2, "0")

// Fecha local en formato AAAA-MM-DD, la misma que usan las actividades
const fechaLocal = (momento: Date) => `${momento.getFullYear()}-${dos(momento.getMonth() + 1)}-${dos(momento.getDate())}`

// Instante local de una fecha y una hora (HH:MM o HH:MM:SS), o NaN si no es válida
const instante = (fecha: string, hora: string) => new Date(`${fecha}T${hora.slice(0, 5)}:00`).getTime()

// Actividades con hora de inicio válida, en orden cronológico
const conInicio = <T extends ActividadConHora>(actividades: T[]) =>
  actividades
    .filter((actividad) => actividad.hora_inicio)
    .map((actividad) => ({ actividad, inicio: instante(actividad.fecha, actividad.hora_inicio as string) }))
    .filter((fila) => Number.isFinite(fila.inicio))
    .sort((a, b) => a.inicio - b.inicio || a.actividad.orden - b.actividad.orden)

// La actividad en curso de hoy: la última que ha empezado, hasta que termina su hora de fin.
// Si el día aún no ha empezado, la primera del día. Fuera de hoy, o si ya han terminado todas, no hay ninguna
export const actividadEnCurso = <T extends ActividadConHora>(actividades: T[], ahora: Date = new Date()): T | null => {
  const deHoy = conInicio(actividades.filter((actividad) => actividad.fecha === fechaLocal(ahora)))
  if (deHoy.length === 0) return null

  const momento = ahora.getTime()
  const empezadas = deHoy.filter((fila) => fila.inicio <= momento)
  if (empezadas.length === 0) return deHoy[0].actividad

  const ultima = empezadas[empezadas.length - 1].actividad
  if (ultima.hora_fin && momento >= instante(ultima.fecha, ultima.hora_fin)) return null
  return ultima
}

// La próxima actividad: la primera que empieza después del momento actual
export const proximaActividad = <T extends ActividadConHora>(actividades: T[], ahora: Date = new Date()): T | null =>
  conInicio(actividades).find((fila) => fila.inicio > ahora.getTime())?.actividad ?? null

// Cuánto falta para que empiece: «En 45 min», «En 2h 30m», «En 3 días»
export const etiquetaCuandoEmpieza = (actividad: ActividadConHora, ahora: Date = new Date()) => {
  const inicio = instante(actividad.fecha, actividad.hora_inicio ?? "00:00")
  const minutos = Math.max(1, Math.round((inicio - ahora.getTime()) / 60000))
  if (minutos < 60) return `En ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    const resto = minutos % 60
    return resto ? `En ${horas}h ${resto}m` : `En ${horas}h`
  }
  const dias = Math.round(minutos / (60 * 24))
  return dias === 1 ? "En 1 día" : `En ${dias} días`
}

// Día de la actividad en lenguaje de persona: «Hoy», «Mañana» o «sábado 12 may»
export const etiquetaDia = (fecha: string, ahora: Date = new Date()) => {
  if (fecha === fechaLocal(ahora)) return "Hoy"
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
  if (fecha === fechaLocal(manana)) return "Mañana"
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "short" }).format(
    new Date(`${fecha}T12:00:00`),
  )
}
