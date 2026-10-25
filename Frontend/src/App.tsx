import { useCallback, useEffect, useState } from "react"
import AppRouter from "./router/AppRouter"
import {
  ApiError,
  URL_LOGIN_GOOGLE,
  login,
  refrescar,
  registrar,
  reenviarConfirmacion,
  cerrarSesion,
  type Sesion,
} from "./services/authApi"
import { borrarSesion, guardarSesion, leerSesion } from "./services/sesionStorage"

export default function App() {
  const [guardadaAlAbrir] = useState(() => leerSesion())
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [comprobando, setComprobando] = useState(guardadaAlAbrir !== null)
  const [sinVerificar, setSinVerificar] = useState(false)
  const [error, setError] = useState("")
  const [errorCodigo, setErrorCodigo] = useState("")
  const [avisoLogin, setAvisoLogin] = useState("")
  const [emailIntento, setEmailIntento] = useState("")
  const [cargando, setCargando] = useState(false)
  const [errorRegistro, setErrorRegistro] = useState("")
  const [avisoRegistro, setAvisoRegistro] = useState("")
  const [cargandoRegistro, setCargandoRegistro] = useState(false)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const renovarSesion = useCallback(
    (guardada: Sesion) =>
      refrescar(guardada.refresh_token)
        .then((tokens) => {
          const renovada = { ...guardada, ...tokens }
          guardarSesion(renovada)
          setSesion(renovada)
          setSinVerificar(false)
        })
        .catch((e) => {
          if (!(e instanceof ApiError)) return
          if (e.estado === 401) borrarSesion()
          if (e.estado === 0) {
            setSesion(guardada)
            setSinVerificar(true)
          }
        }),
    [],
  )

  useEffect(() => {
    const guardada = guardadaAlAbrir
    if (!guardada) return
    renovarSesion(guardada).finally(() => setComprobando(false))
  }, [guardadaAlAbrir, renovarSesion])

  useEffect(() => {
    if (!sinVerificar) return
    const alVolverLaRed = () => {
      const guardada = leerSesion()
      if (guardada) renovarSesion(guardada)
    }
    window.addEventListener("online", alVolverLaRed)
    return () => window.removeEventListener("online", alVolverLaRed)
  }, [sinVerificar, renovarSesion])

  const handleLogin = async (email: string, password: string) => {
    setCargando(true)
    setError("")
    setErrorCodigo("")
    setAvisoLogin("")
    setEmailIntento(email)
    try {
      const nueva = await login(email, password)
      guardarSesion(nueva)
      setSesion(nueva)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
      setErrorCodigo(e instanceof ApiError ? e.codigo : "")
    } finally {
      setCargando(false)
    }
  }

  const handleReenviarConfirmacion = async () => {
    setCargando(true)
    setAvisoLogin("")
    try {
      await reenviarConfirmacion(emailIntento)
      setError("")
      setErrorCodigo("")
      setAvisoLogin("Te hemos enviado un nuevo correo de confirmación")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
    } finally {
      setCargando(false)
    }
  }

  const handleRegistro = async (nombre: string, email: string, password: string) => {
    setCargandoRegistro(true)
    setErrorRegistro("")
    setAvisoRegistro("")
    try {
      const respuesta = await registrar(nombre, email, password)
      if ("token" in respuesta) {
        guardarSesion(respuesta)
        setSesion(respuesta)
      } else {
        setAvisoRegistro("Cuenta creada. Revisa tu correo y confirma tu email para iniciar sesión")
      }
    } catch (e) {
      setErrorRegistro(e instanceof ApiError ? e.message : "Ha ocurrido un error")
    } finally {
      setCargandoRegistro(false)
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

  const handleCerrarSesion = async () => {
    setCerrandoSesion(true)
    if (sesion) await cerrarSesion(sesion.token).catch(() => undefined)
    borrarSesion()
    setSesion(null)
    setCerrandoSesion(false)
  }

  if (comprobando) return null

  return (
    <AppRouter
      session={sesion}
      handleLogin={handleLogin}
      handleRegistro={handleRegistro}
      errorRegistro={errorRegistro}
      avisoRegistro={avisoRegistro}
      loadingRegistro={cargandoRegistro}
      handleReenviarConfirmacion={
        errorCodigo === "email_no_confirmado" ? handleReenviarConfirmacion : undefined
      }
      avisoLogin={avisoLogin}
      handleGoogleLogin={handleGoogleLogin}
      handleSesionGoogle={handleSesionGoogle}
      handleErrorGoogle={handleErrorGoogle}
      handleCerrarSesion={handleCerrarSesion}
      cerrandoSesion={cerrandoSesion}
      error={error}
      loading={cargando}
    />
  )
}
