import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { leerResultadoGoogle, type Sesion } from "../services/authApi"

type AuthCallbackProps = {
  onSesion: (sesion: Sesion) => void
  onError: (mensaje: string) => void
}

export default function AuthCallback({ onSesion, onError }: AuthCallbackProps) {
  const navigate = useNavigate()
  const procesado = useRef(false)

  useEffect(() => {
    if (procesado.current) return
    procesado.current = true

    const resultado = leerResultadoGoogle(window.location.hash)
    if ("sesion" in resultado) {
      onSesion(resultado.sesion)
      navigate("/", { replace: true })
    } else {
      onError(resultado.error)
      navigate("/login", { replace: true })
    }
  }, [navigate, onSesion, onError])

  return null
}
