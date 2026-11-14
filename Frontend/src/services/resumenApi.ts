import { peticion } from "./authApi"

export type GastoMayor = {
  concepto: string
  importe: number
}

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

export type ResumenDelViaje = {
  dias: number
  gasto_total: number
  gasto_mayor: GastoMayor | null
  actividad_mas_votada: ActividadMasVotada | null
  alma_del_grupo: AlmaDelGrupo | null
}

export const obtenerResumenDelViaje = async (viajeId: string, tokenSesion: string) => {
  const resumen = await peticion<ResumenDelViaje>(`/viajes/${encodeURIComponent(viajeId)}/resumen`, {
    token: tokenSesion,
  })
  const valido =
    Number.isFinite(resumen?.dias) &&
    Number.isFinite(resumen?.gasto_total) &&
    (resumen.gasto_mayor === null || typeof resumen.gasto_mayor?.concepto === "string") &&
    (resumen.actividad_mas_votada === null || typeof resumen.actividad_mas_votada?.titulo === "string") &&
    (resumen.alma_del_grupo == null || Number.isFinite(resumen.alma_del_grupo.pagos))
  if (!valido) throw new Error("Respuesta del resumen no válida")
  return { ...resumen, alma_del_grupo: resumen.alma_del_grupo ?? null }
}
