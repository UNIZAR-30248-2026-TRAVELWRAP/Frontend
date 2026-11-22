import { io } from "socket.io-client"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

// El servidor de WebSocket es el mismo que el de la API, sin el /api
const URL_SOCKET = new URL(API_URL).origin

export type PantallaAviso = "votaciones" | "gastos" | "tareas" | "chat"

// Aviso de un evento nuevo en un viaje: lo que ha pasado y a qué pantalla lleva
export type AvisoViaje = {
  viaje_id: string
  viaje_nombre: string
  tipo: "votacion" | "gasto" | "tarea" | "mensaje"
  pantalla: PantallaAviso
  texto: string
}

// Ruta de la pantalla a la que lleva el aviso
export const rutaDeAviso = (aviso: Pick<AvisoViaje, "viaje_id" | "pantalla">) => {
  const base = `/viajes/${aviso.viaje_id}`
  return aviso.pantalla === "tareas" ? `${base}/documentos?pestana=tareas` : `${base}/${aviso.pantalla}`
}

// Escucha los avisos de todos los viajes del usuario mientras tenga la sesión abierta. Devuelve la función que deja de escuchar
export const escucharAvisos = (tokenSesion: string, alRecibir: (aviso: AvisoViaje) => void) => {
  const socket = io(`${URL_SOCKET}/notificaciones`, { auth: { token: tokenSesion }, transports: ["websocket"] })
  socket.on("notificacion", alRecibir)

  return () => {
    socket.disconnect()
  }
}
