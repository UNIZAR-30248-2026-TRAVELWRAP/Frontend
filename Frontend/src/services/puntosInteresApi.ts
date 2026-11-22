import { peticion } from "./authApi"
import type { Categoria } from "./actividadesApi"

export type PuntoInteres = {
  id: string
  viaje_id: string
  nombre: string
  nota: string | null
  categoria: Categoria | null
  latitud: number
  longitud: number
  lugar_externo_id: string | null
  creado_por: string | null
  creado_en: string
}

export type NuevoPuntoInteres = {
  nombre: string
  nota: string | null
  categoria: Categoria | null
  latitud: number
  longitud: number
  lugar_externo_id: string | null
}

const rutaDe = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/puntos-de-interes`

export const listarPuntosInteres = (viajeId: string, tokenSesion: string) =>
  peticion<{ puntos_interes: PuntoInteres[] }>(rutaDe(viajeId), { token: tokenSesion })

export const crearPuntoInteres = (viajeId: string, punto: NuevoPuntoInteres, tokenSesion: string) =>
  peticion<PuntoInteres>(rutaDe(viajeId), { metodo: "POST", cuerpo: punto, token: tokenSesion })

export const eliminarPuntoInteres = (viajeId: string, puntoId: string, tokenSesion: string) =>
  peticion<null>(`${rutaDe(viajeId)}/${encodeURIComponent(puntoId)}`, { metodo: "DELETE", token: tokenSesion })
