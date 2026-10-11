import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import appLogo from "../assets/travelwrap-logo.png"
import { ApiError, type Sesion } from "../services/authApi"
import { unirseAViaje, type ViajeUnido } from "../services/invitacionesApi"
import {
  borrarInvitacionPendiente,
  guardarInvitacionPendiente,
} from "../services/invitacionPendiente"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

const MENSAJES_ERROR: Record<string, string> = {
  invitacion_no_encontrada: "Este enlace de invitación no es válido",
  viaje_no_activo: "Este viaje ya ha terminado y no admite nuevos miembros",
  sin_sesion: "Tu sesión ha caducado. Vuelve a iniciar sesión",
  sesion_invalida: "Tu sesión ha caducado. Vuelve a iniciar sesión",
}

const textoStyle: CSSProperties = {
  fontFamily: NUNITO,
  color: C.muted,
  fontSize: 14,
  lineHeight: 1.5,
}

const tituloStyle: CSSProperties = {
  fontFamily: NUNITO,
  color: C.navy,
  fontSize: 24,
  fontWeight: 800,
  lineHeight: 1.2,
  marginBottom: 8,
}

const botonStyle: CSSProperties = {
  width: "100%",
  background: C.navy,
  color: "white",
  border: "none",
  borderRadius: 16,
  padding: 15,
  marginTop: 24,
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
}

type UnirseViajeProps = {
  sesion: Sesion | null
}

export default function UnirseViaje({ sesion }: UnirseViajeProps) {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const procesado = useRef(false)
  const [resultado, setResultado] = useState<ViajeUnido | null>(null)
  const [error, setError] = useState("")

  const tokenSesion = sesion?.token

  useEffect(() => {
    if (!tokenSesion || procesado.current) return
    procesado.current = true

    borrarInvitacionPendiente()
    unirseAViaje(token, tokenSesion)
      .then(setResultado)
      .catch((e) => {
        setError(
          e instanceof ApiError ? (MENSAJES_ERROR[e.codigo] ?? e.message) : "Ha ocurrido un error",
        )
      })
  }, [token, tokenSesion])

  // Sin sesión: se recuerda la invitación y se vuelve aquí después del login
  if (!sesion) {
    guardarInvitacionPendiente(token)
    return <Navigate to="/login" replace />
  }

  const irAlInicio = () => navigate("/", { replace: true })

  return (
    <div
      style={{
        background: GRADIENTS.hero,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          boxSizing: "border-box",
          background: C.card,
          borderRadius: RADIUS.xl,
          boxShadow: SHADOWS.cardRaised,
          padding: "32px 24px 24px",
          textAlign: "center",
        }}
      >
        <img
          src={appLogo}
          alt="Logo de TravelWrap"
          style={{ width: 72, height: 72, borderRadius: 20, objectFit: "cover", marginBottom: 20 }}
        />

        {error && (
          <div role="alert">
            <div style={tituloStyle}>No has podido unirte al viaje</div>
            <div style={textoStyle}>{error}</div>
            <button type="button" onClick={irAlInicio} style={botonStyle}>
              Ir al inicio
            </button>
          </div>
        )}

        {!error && !resultado && (
          <div role="status" style={textoStyle}>
            Uniéndote al viaje...
          </div>
        )}

        {resultado && (
          <>
            <div style={tituloStyle}>
              {resultado.ya_era_miembro
                ? `Ya formas parte de ${resultado.viaje.nombre}`
                : `¡Bienvenido a ${resultado.viaje.nombre}!`}
            </div>
            <div style={textoStyle}>
              {resultado.ya_era_miembro
                ? `Ya eras miembro de este viaje a ${resultado.viaje.destino}.`
                : `Te has unido al viaje a ${resultado.viaje.destino}. Ya puedes ver el itinerario, los gastos y el chat del grupo.`}
            </div>
            <button type="button" onClick={irAlInicio} style={botonStyle}>
              Entrar al viaje
            </button>
          </>
        )}
      </div>
    </div>
  )
}
