import type { Actividad } from "./actividadesApi"
import type { ViajeDelUsuario } from "./viajesApi"

const PREFIJO = "travelwrap.itinerario."

export type ItinerarioGuardado = {
  viaje: ViajeDelUsuario
  actividades: Actividad[]
  guardadoEn: string
}

export const guardarItinerario = (viajeId: string, itinerario: ItinerarioGuardado) => {
  try {
    localStorage.setItem(PREFIJO + viajeId, JSON.stringify(itinerario))
  } catch {
    return
  }
}

export const leerItinerario = (viajeId: string): ItinerarioGuardado | null => {
  try {
    const valor = localStorage.getItem(PREFIJO + viajeId)
    if (!valor) return null
    const itinerario = JSON.parse(valor) as ItinerarioGuardado
    return itinerario?.viaje?.id && Array.isArray(itinerario.actividades) && itinerario.guardadoEn ? itinerario : null
  } catch {
    return null
  }
}

export const borrarItinerarios = () => {
  try {
    Object.keys(localStorage)
      .filter((clave) => clave.startsWith(PREFIJO))
      .forEach((clave) => localStorage.removeItem(clave))
  } catch {
    return
  }
}
