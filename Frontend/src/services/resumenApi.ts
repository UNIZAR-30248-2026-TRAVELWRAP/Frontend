import { peticion } from "./authApi"

export type GastoMayor = {
  concepto: string
  importe: number
}

export type ActividadMasVotada = {
  titulo: string
  votos: number
}

export type ResumenDelViaje = {
  dias: number
  gasto_total: number
  gasto_mayor: GastoMayor | null
  actividad_mas_votada: ActividadMasVotada | null
}

export const obtenerResumenDelViaje = async (viajeId: string, tokenSesion: string) => {
  const resumen = await peticion<ResumenDelViaje>(`/viajes/${encodeURIComponent(viajeId)}/resumen`, {
    token: tokenSesion,
  })
  const valido =
    Number.isFinite(resumen?.dias) &&
    Number.isFinite(resumen?.gasto_total) &&
    (resumen.gasto_mayor === null || typeof resumen.gasto_mayor?.concepto === "string") &&
    (resumen.actividad_mas_votada === null || typeof resumen.actividad_mas_votada?.titulo === "string")
  if (!valido) throw new Error("Respuesta del resumen no válida")
  return resumen
}
