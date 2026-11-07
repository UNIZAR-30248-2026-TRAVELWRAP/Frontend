import type { Sesion } from "./authApi"
import { borrarItinerarios } from "./itinerarioGuardado"
import { copiaValida, email, fechaHora, identificador, objeto, opcional, texto, token, urlImagen } from "../utils/datosGuardados"

const CLAVE = "travelwrap.sesion"

// Copia de la sesión con solo los campos esperados, cada uno con su formato. null si algo no encaja
const sesionValida = (valor: unknown): Sesion | null =>
  copiaValida(() => {
    const sesion = objeto(valor)
    const usuario = objeto(sesion.usuario)
    return {
      usuario: {
        id: identificador(usuario.id),
        nombre: opcional(texto)(usuario.nombre),
        email: email(usuario.email),
        avatar_url: opcional(urlImagen)(usuario.avatar_url),
        creado_en: fechaHora(usuario.creado_en),
      },
      token: token(sesion.token),
      refresh_token: token(sesion.refresh_token),
    }
  })

export const leerSesion = (): Sesion | null => {
  try {
    const valor = localStorage.getItem(CLAVE)
    return valor ? sesionValida(JSON.parse(valor)) : null
  } catch {
    return null
  }
}

// Una sesión con un formato inesperado no se guarda: al volver a abrir la app habrá que iniciar sesión otra vez
export const guardarSesion = (sesion: Sesion) => {
  const valida = sesionValida(sesion)
  if (!valida) return
  try {
    localStorage.setItem(CLAVE, JSON.stringify(valida))
  } catch {
    return
  }
}

export const borrarSesion = () => {
  borrarItinerarios()
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    return
  }
}
