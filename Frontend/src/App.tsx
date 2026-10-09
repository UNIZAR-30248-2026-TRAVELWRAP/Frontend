import { useCallback, useEffect, useState } from "react"
import AppRouter from "./router/AppRouter"
import { ApiError, URL_LOGIN_GOOGLE, login, refrescar, type Sesion } from "./services/authApi"
import { borrarSesion, guardarSesion, leerSesion } from "./services/sesionStorage"

export default function App() {
  const [guardadaAlAbrir] = useState(() => leerSesion())
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [comprobando, setComprobando] = useState(guardadaAlAbrir !== null)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const guardada = guardadaAlAbrir
    if (!guardada) return
    refrescar(guardada.refresh_token)
      .then((tokens) => {
        const renovada = { ...guardada, ...tokens }
        guardarSesion(renovada)
        setSesion(renovada)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.estado === 401) borrarSesion()
      })
      .finally(() => setComprobando(false))
  }, [guardadaAlAbrir])

  const handleLogin = async (email: string, password: string) => {
    setCargando(true)
    setError("")
    try {
      const nueva = await login(email, password)
      guardarSesion(nueva)
      setSesion(nueva)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
    } finally {
      setCargando(false)
    }
  }

  const handleGoogleLogin = () => {
    setError("")
    setCargando(true)
    window.location.assign(URL_LOGIN_GOOGLE)
  }

  const handleSesionGoogle = useCallback((nueva: Sesion) => {
    guardarSesion(nueva)
    setError("")
    setSesion(nueva)
  }, [])

  const handleErrorGoogle = useCallback((mensaje: string) => {
    setError(mensaje)
  }, [])

  if (comprobando) return null

  return (
    <AppRouter
      session={sesion}
      handleLogin={handleLogin}
      handleGoogleLogin={handleGoogleLogin}
      handleSesionGoogle={handleSesionGoogle}
      handleErrorGoogle={handleErrorGoogle}
      error={error}
      loading={cargando}
    />
  )
}
