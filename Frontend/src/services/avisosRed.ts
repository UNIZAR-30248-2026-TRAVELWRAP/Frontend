// Aviso global de fallo de conexión con el servidor.
// peticion() lo emite cuando no hay respuesta y el componente AvisoConexion lo muestra,
// así las pantallas no tienen que gestionar el toast cada una.
type Escucha = () => void

const escuchas = new Set<Escucha>()

export const avisarSinConexion = () => {
  escuchas.forEach((escucha) => escucha())
}

// Devuelve la función para dejar de escuchar
export const alSinConexion = (escucha: Escucha) => {
  escuchas.add(escucha)
  return () => {
    escuchas.delete(escucha)
  }
}
