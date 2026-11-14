import type { Tarea } from "../services/tareasApi"

export type ProgresoTareas = {
  hechas: number
  total: number
  pendientes: number
  // Entero de 0 a 100; 0 si no hay tareas
  porcentaje: number
}

// Resumen de la lista de tareas: cuántas están hechas, cuántas faltan y el porcentaje completado
export const progresoDeTareas = (tareas: Pick<Tarea, "hecha">[]): ProgresoTareas => {
  const total = tareas.length
  const hechas = tareas.filter((tarea) => tarea.hecha).length
  return {
    hechas,
    total,
    pendientes: total - hechas,
    porcentaje: total === 0 ? 0 : Math.round((hechas / total) * 100),
  }
}
