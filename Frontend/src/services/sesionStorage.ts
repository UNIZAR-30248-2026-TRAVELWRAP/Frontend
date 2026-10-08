import type { Sesion } from "./authApi"

const CLAVE = "travelwrap.sesion"

export const leerSesion = (): Sesion | null => {
  try {
    const valor = localStorage.getItem(CLAVE)
    return valor ? (JSON.parse(valor) as Sesion) : null
  } catch {
    return null
  }
}

export const guardarSesion = (sesion: Sesion) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion))
  } catch {
    return
  }
}

export const borrarSesion = () => {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    return
  }
}
