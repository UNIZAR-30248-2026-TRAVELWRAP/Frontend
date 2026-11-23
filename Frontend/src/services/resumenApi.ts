import { peticion } from "./authApi"

export type ActividadMasVotada = {
  titulo: string
  votos: number
}

export type AlmaDelGrupo = {
  usuario_id: string
  nombre: string | null
  pagos: number
  planes_propuestos: number
  fotos_subidas: number
}

// Presupuesto del viaje menos lo gastado en sus gastos. El restante es negativo si se supera
export type PresupuestoRestante = {
  total: number
  gastado: number
  restante: number
}

export type ResumenDelViaje = {
  dias: number
  actividad_mas_votada: ActividadMasVotada | null
  alma_del_grupo: AlmaDelGrupo | null
  presupuesto?: PresupuestoRestante | null
}

export const obtenerResumenDelViaje = async (viajeId: string, tokenSesion: string) => {
  const resumen = await peticion<ResumenDelViaje>(`/viajes/${encodeURIComponent(viajeId)}/resumen`, {
    token: tokenSesion,
  })
  const valido =
    Number.isFinite(resumen?.dias) &&
    (resumen.actividad_mas_votada === null || typeof resumen.actividad_mas_votada?.titulo === "string") &&
    (resumen.alma_del_grupo == null || Number.isFinite(resumen.alma_del_grupo.pagos)) &&
    (resumen.presupuesto == null || Number.isFinite(resumen.presupuesto.restante))
  if (!valido) throw new Error("Respuesta del resumen no válida")
  return { ...resumen, alma_del_grupo: resumen.alma_del_grupo ?? null, presupuesto: resumen.presupuesto ?? null }
}
