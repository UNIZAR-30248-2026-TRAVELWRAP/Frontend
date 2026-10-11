// Invitación abierta sin sesión: se guarda mientras el usuario inicia sesión.
// sessionStorage sobrevive a la redirección del login con Google en la misma pestaña.
const CLAVE = "travelwrap.invitacionPendiente"

export const leerInvitacionPendiente = (): string | null => {
  try {
    return sessionStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export const guardarInvitacionPendiente = (token: string) => {
  try {
    sessionStorage.setItem(CLAVE, token)
  } catch {
    return
  }
}

export const borrarInvitacionPendiente = () => {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    return
  }
}

export const rutaTrasLogin = () => {
  const pendiente = leerInvitacionPendiente()
  return pendiente ? `/unirse/${encodeURIComponent(pendiente)}` : "/"
}
