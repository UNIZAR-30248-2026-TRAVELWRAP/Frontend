const MS_POR_DIA = 86400000

const fechaLocal = (momento: Date) => {
  const dos = (numero: number) => String(numero).padStart(2, "0")
  return `${momento.getFullYear()}-${dos(momento.getMonth() + 1)}-${dos(momento.getDate())}`
}

// Etiqueta del estado de un viaje activo según sus fechas: «Próximo · faltan N días» si aún no ha empezado,
// y «En curso» desde su primer día. Sin fecha de inicio no se puede saber, así que se muestra «En curso»
export const etiquetaEstadoActivo = (fechaInicio: string | null | undefined, ahora: Date = new Date()) => {
  if (!fechaInicio || fechaInicio <= fechaLocal(ahora)) return "En curso"
  const dias = Math.round((Date.parse(`${fechaInicio}T00:00:00Z`) - Date.parse(`${fechaLocal(ahora)}T00:00:00Z`)) / MS_POR_DIA)
  if (dias === 1) return "Próximo · mañana"
  return `Próximo · faltan ${dias} días`
}
