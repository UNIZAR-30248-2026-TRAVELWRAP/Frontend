import type { ViajeDelUsuario } from "./viajesApi"

// Último estado de cada viaje que ha cargado la app, en memoria. Las pantallas del viaje lo usan como valor
// inicial al abrirse, para que la cabecera aparezca al instante mientras llega la versión actual.
// Se vacía al cerrar la sesión, para no enseñar un viaje a la siguiente persona que entre en el dispositivo
const viajes = new Map<string, ViajeDelUsuario>()

export const guardarViajeEnCache = (viaje: ViajeDelUsuario) => {
  viajes.set(viaje.id, viaje)
}

export const viajeEnCache = (viajeId: string): ViajeDelUsuario | null => viajes.get(viajeId) ?? null

export const olvidarViajes = () => {
  viajes.clear()
}
