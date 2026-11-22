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

export type ResumenDelViaje = {
  dias: number
  actividad_mas_votada: ActividadMasVotada | null
  alma_del_grupo: AlmaDelGrupo | null
}

export const obtenerResumenDelViaje = async (viajeId: string, tokenSesion: string) => {
  const resumen = await peticion<ResumenDelViaje>(`/viajes/${encodeURIComponent(viajeId)}/resumen`, {
    token: tokenSesion,
  })
  const valido =
    Number.isFinite(resumen?.dias) &&
    (resumen.actividad_mas_votada === null || typeof resumen.actividad_mas_votada?.titulo === "string") &&
    (resumen.alma_del_grupo == null || Number.isFinite(resumen.alma_del_grupo.pagos))
  if (!valido) throw new Error("Respuesta del resumen no válida")
  return { ...resumen, alma_del_grupo: resumen.alma_del_grupo ?? null }
}
