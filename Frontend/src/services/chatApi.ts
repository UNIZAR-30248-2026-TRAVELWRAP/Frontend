import { peticion } from "./authApi"

// Mensaje del chat del viaje. El autor sale con su nombre y avatar; el nombre es null si ya abandonó el viaje
export type Mensaje = {
  id: string
  texto: string
  creado_en: string
  autor: {
    usuario_id: string
    nombre: string | null
    avatar_url: string | null
  }
}

const rutaMensajes = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/mensajes`

// Hasta 50 mensajes en orden cronológico. Con antes (fecha ISO) devuelve los 50 anteriores a esa fecha
export const listarMensajes = (viajeId: string, tokenSesion: string, antes?: string) =>
  peticion<{ mensajes: Mensaje[] }>(
    `${rutaMensajes(viajeId)}${antes ? `?antes=${encodeURIComponent(antes)}` : ""}`,
    { token: tokenSesion },
  )

// Guarda un mensaje y devuelve el mensaje guardado (solo con el viaje activo)
export const enviarMensaje = (viajeId: string, texto: string, tokenSesion: string) =>
  peticion<Mensaje>(rutaMensajes(viajeId), { metodo: "POST", cuerpo: { texto }, token: tokenSesion })
