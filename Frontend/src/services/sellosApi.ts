import { peticion } from "./authApi"

export type DisenoSello = "chincheta" | "mapa" | "ruta" | "avion"

export type Sello = {
  id: string
  // null si el viaje se ha borrado del todo
  viaje_id: string | null
  diseno: DisenoSello
  // Destino y año del viaje cuando se eligió el sello
  destino: string
  anio: number
  elegido_en: string
}

const rutaSello = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/sello`

// Sello del usuario en este viaje; null si no ha elegido ninguno
export const obtenerSello = (viajeId: string, tokenSesion: string) =>
  peticion<{ sello: Sello | null }>(rutaSello(viajeId), { token: tokenSesion })

// Elige el sello o cambia el que había. Solo vale con el viaje terminado
export const elegirSello = (viajeId: string, diseno: DisenoSello, tokenSesion: string) =>
  peticion<{ sello: Sello }>(rutaSello(viajeId), { metodo: "PUT", cuerpo: { diseno }, token: tokenSesion })

// Quita el sello del usuario en este viaje. Responde 204 sin cuerpo
export const quitarSello = (viajeId: string, tokenSesion: string) =>
  peticion<null>(rutaSello(viajeId), { metodo: "DELETE", token: tokenSesion })
