import { peticion } from "./authApi"

export type PuntoDeRuta = {
  id: string
  titulo: string
  latitud: number
  longitud: number
}

export type TrazadoDeRuta = {
  distancia_m: number
  duracion_s: number
  geometria: [number, number][]
}

export type RutaDelDia = {
  puntos: PuntoDeRuta[]
  orden_sugerido: string[]
  ahorro_m: number
  ruta: TrazadoDeRuta | null
}

export const obtenerRutaDelDia = async (viajeId: string, fecha: string, tokenSesion: string) => {
  const datos = await peticion<RutaDelDia>(
    `/viajes/${encodeURIComponent(viajeId)}/ruta?fecha=${encodeURIComponent(fecha)}`,
    { token: tokenSesion },
  )
  const valida =
    Array.isArray(datos?.puntos) &&
    Array.isArray(datos?.orden_sugerido) &&
    (datos.ruta === null || Array.isArray(datos.ruta?.geometria))
  if (!valida) throw new Error("Respuesta de ruta no válida")
  return datos
}
