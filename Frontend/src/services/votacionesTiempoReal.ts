import { io } from "socket.io-client"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

// El servidor de WebSocket es el mismo que el de la API, sin el /api
const URL_SOCKET = new URL(API_URL).origin

export type MotivoCambio = "creada" | "opcion" | "voto" | "cerrada"

// Aviso del servidor de que ha cambiado una votación del viaje. No trae sus datos: hay que volver a pedirla
export type CambioVotacion = {
  viaje_id: string
  votacion_id: string
  motivo: MotivoCambio
  // Solo al cerrar la votación de destino: el destino fijado en el viaje
  destino?: string | null
}

// Escucha los cambios de las votaciones de un viaje mientras la pantalla está abierta.
// Devuelve la función que deja de escuchar (para el cleanup de useEffect)
export const escucharVotaciones = (
  viajeId: string,
  tokenSesion: string,
  alCambiar: (cambio: CambioVotacion) => void,
) => {
  const socket = io(`${URL_SOCKET}/votaciones`, { auth: { token: tokenSesion }, transports: ["websocket"] })

  // También al reconectarse: las salas no se conservan entre conexiones
  socket.on("connect", () => {
    socket.emit("unirse_viaje", { viaje_id: viajeId })
  })
  socket.on("votacion_cambiada", (cambio: CambioVotacion) => {
    if (cambio.viaje_id === viajeId) alCambiar(cambio)
  })

  return () => {
    socket.disconnect()
  }
}
