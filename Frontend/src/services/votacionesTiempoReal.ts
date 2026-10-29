import { io } from "socket.io-client"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"

// El servidor de WebSocket es el mismo que el de la API, sin el /api
const URL_SOCKET = new URL(API_URL).origin

// Aviso del servidor de que ha cambiado una votación del viaje o sus miembros. No trae los datos: hay que
// volver a pedirlos
export type CambioVotacion =
  | {
      viaje_id: string
      motivo: "creada" | "opcion" | "voto" | "cerrada"
      votacion_id: string
      // Solo al cerrar la votación de destino: el destino fijado en el viaje
      destino?: string | null
    }
  // Se ha unido alguien al viaje: cambia quién puede votar en todas sus votaciones
  | { viaje_id: string; motivo: "miembros" }

export type MotivoCambio = CambioVotacion["motivo"]

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
