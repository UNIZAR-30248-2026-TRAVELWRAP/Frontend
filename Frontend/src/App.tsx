import { useEffect, useState } from "react"
import AppRouter from "./router/AppRouter"
import { ApiError, login, refrescar, type Sesion } from "./services/authApi"
import { borrarSesion, guardarSesion, leerSesion } from "./services/sesionStorage"

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [comprobando, setComprobando] = useState(() => leerSesion() !== null)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const guardada = leerSesion()
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
  }, [])

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

  if (comprobando) return null

  return (
    <AppRouter
      session={sesion}
      handleLogin={handleLogin}
      error={error}
      loading={cargando}
    />
  )
}
