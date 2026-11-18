import { io } from "socket.io-client"
import type { Mensaje } from "./chatApi"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

// El servidor de WebSocket es el mismo que el de la API, sin el /api
const URL_SOCKET = new URL(API_URL).origin

// Escucha los mensajes nuevos de un viaje mientras la pantalla está abierta. Devuelve la función que deja de escuchar
export const escucharMensajes = (viajeId: string, tokenSesion: string, alRecibir: (mensaje: Mensaje) => void) => {
  const socket = io(`${URL_SOCKET}/chat`, { auth: { token: tokenSesion }, transports: ["websocket"] })

  // También al reconectarse: las salas no se conservan entre conexiones
  socket.on("connect", () => {
    socket.emit("unirse_viaje", { viaje_id: viajeId })
  })
  socket.on("mensaje", (datos: { viaje_id: string; mensaje: Mensaje }) => {
    if (datos.viaje_id === viajeId) alRecibir(datos.mensaje)
  })

  return () => {
    socket.disconnect()
  }
}
