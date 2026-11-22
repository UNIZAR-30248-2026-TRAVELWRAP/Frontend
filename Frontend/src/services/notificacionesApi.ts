import { peticion } from "./authApi"

// Clave pública VAPID del servidor, con la que el navegador crea la suscripción push (503 si no está configurada)
export const obtenerClavePush = (tokenSesion: string) =>
  peticion<{ clave: string }>("/notificaciones/clave-publica", { token: tokenSesion })

// Guarda la suscripción push de este dispositivo para recibir los avisos de los viajes
export const guardarSuscripcion = (suscripcion: PushSubscriptionJSON, tokenSesion: string) =>
  peticion<{ endpoint: string }>("/notificaciones/suscripciones", {
    metodo: "POST",
    cuerpo: suscripcion,
    token: tokenSesion,
  })

// Da de baja la suscripción push de este dispositivo
export const borrarSuscripcion = (endpoint: string, tokenSesion: string) =>
  peticion<void>("/notificaciones/suscripciones", { metodo: "DELETE", cuerpo: { endpoint }, token: tokenSesion })
