import { peticion } from "./authApi"

// Playlist compartida del viaje: el enlace de Spotify y cuándo se cambió. playlist es null si el viaje no tiene ninguna
export type PlaylistViaje = {
  url: string
  actualizado_en: string
}

export type RespuestaPlaylist = {
  playlist: PlaylistViaje | null
}

const rutaPlaylist = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/playlist`

// La playlist del viaje (la ve cualquier miembro, también en viajes finalizados)
export const obtenerPlaylist = (viajeId: string, tokenSesion: string) =>
  peticion<RespuestaPlaylist>(rutaPlaylist(viajeId), { token: tokenSesion })

// Enlaza o cambia la playlist. El backend admite enlaces de Spotify de una playlist y devuelve el canónico
export const guardarPlaylist = (viajeId: string, url: string, tokenSesion: string) =>
  peticion<RespuestaPlaylist>(rutaPlaylist(viajeId), { metodo: "PUT", cuerpo: { url }, token: tokenSesion })

// Quita la playlist del viaje (con el viaje activo)
export const quitarPlaylist = (viajeId: string, tokenSesion: string) =>
  peticion<null>(rutaPlaylist(viajeId), { metodo: "DELETE", token: tokenSesion })
