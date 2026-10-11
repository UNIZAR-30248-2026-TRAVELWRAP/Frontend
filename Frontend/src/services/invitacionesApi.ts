import { peticion } from "./authApi"

export type EnlaceInvitacion = {
  token: string
  enlace: string
}

export type ViajeUnido = {
  viaje: {
    id: string
    nombre: string
    destino: string
    imagen_portada_url: string | null
  }
  miembro: {
    rol: "creador" | "miembro"
    unido_en: string
  }
  ya_era_miembro: boolean
}

export const obtenerEnlaceInvitacion = (viajeId: string, tokenSesion: string) =>
  peticion<EnlaceInvitacion>(`/viajes/${viajeId}/invitacion`, { token: tokenSesion })

export const unirseAViaje = (tokenInvitacion: string, tokenSesion: string) =>
  peticion<ViajeUnido>(`/invitaciones/${encodeURIComponent(tokenInvitacion)}/unirse`, {
    metodo: "POST",
    token: tokenSesion,
  })
