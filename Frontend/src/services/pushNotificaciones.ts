import { borrarSuscripcion, guardarSuscripcion, obtenerClavePush } from "./notificacionesApi"

// La clave VAPID llega en base64 de URL y el navegador la pide como bytes
const claveABytes = (clave: string) => {
  const base64 = (clave + "=".repeat((4 - (clave.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0))
}

// El navegador puede recibir notificaciones push (service worker, Push API y Notification)
export const pushSoportado = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

// Service worker de la app. No hay en desarrollo ni antes del primer registro: ready no se resolvería nunca
const registroActual = () => navigator.serviceWorker.getRegistration()

const suscripcionActual = async () => (await registroActual())?.pushManager.getSubscription() ?? null

// Estado de las push en este dispositivo: activadas, desactivadas, bloqueadas por el navegador o sin soporte
export type EstadoPush = "activadas" | "desactivadas" | "bloqueadas" | "no_soportadas"

export const estadoPush = async (): Promise<EstadoPush> => {
  if (!pushSoportado()) return "no_soportadas"
  if (Notification.permission === "denied") return "bloqueadas"
  if (Notification.permission !== "granted") return "desactivadas"
  return (await suscripcionActual()) ? "activadas" : "desactivadas"
}

// Pide permiso, suscribe este dispositivo y guarda la suscripción en el servidor. Devuelve el estado resultante
export const activarPush = async (tokenSesion: string): Promise<EstadoPush> => {
  if (!pushSoportado()) return "no_soportadas"
  if ((await Notification.requestPermission()) !== "granted") return estadoPush()

  const { clave } = await obtenerClavePush(tokenSesion)
  const registro = await registroActual()
  if (!registro) throw new Error("La app todavía no tiene service worker")
  const suscripcion =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) }))
  await guardarSuscripcion(suscripcion.toJSON(), tokenSesion)
  return "activadas"
}

// Da de baja este dispositivo, en el servidor y en el navegador
export const desactivarPush = async (tokenSesion: string): Promise<EstadoPush> => {
  if (!pushSoportado()) return "no_soportadas"
  const suscripcion = await suscripcionActual()
  if (suscripcion) {
    await borrarSuscripcion(suscripcion.endpoint, tokenSesion)
    await suscripcion.unsubscribe()
  }
  return estadoPush()
}

// Con las push ya activadas en este dispositivo, vuelve a guardar la suscripción para la cuenta con la que se ha
// entrado (el dispositivo puede haberse usado con otra). No pide permiso ni falla si no se puede
export const sincronizarPush = async (tokenSesion: string) => {
  try {
    const suscripcion = pushSoportado() && Notification.permission === "granted" ? await suscripcionActual() : null
    if (suscripcion) await guardarSuscripcion(suscripcion.toJSON(), tokenSesion)
  } catch {
    // Sin conexión o sin servicio push: se reintentará en la próxima sesión
  }
}

// Al cerrar sesión quita este dispositivo de la cuenta, para que no reciba los avisos de quien salió. El navegador
// conserva la suscripción: se vuelve a guardar al entrar (sincronizarPush)
export const soltarPush = async (tokenSesion: string) => {
  try {
    const suscripcion = pushSoportado() ? await suscripcionActual() : null
    if (suscripcion) await borrarSuscripcion(suscripcion.endpoint, tokenSesion)
  } catch {
    // Sin conexión: la cuenta conserva el dispositivo hasta que se vuelva a dar de baja
  }
}
