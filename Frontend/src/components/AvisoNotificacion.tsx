import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Icon from "./Icon"
import appLogo from "../assets/travelwrap-logo.png"
import { escucharAvisos, rutaDeAviso, type AvisoViaje } from "../services/notificacionesTiempoReal"
import { sincronizarPush } from "../services/pushNotificaciones"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

const DURACION_MS = 6000

// Aviso (toast) de una votación, un gasto, una tarea o un mensaje nuevo en un viaje. Al tocarlo abre su pantalla.
// Se monta una vez dentro del router mientras haya sesión. No avisa si el usuario ya está viendo esa pantalla
export default function AvisoNotificacion({ tokenSesion }: { tokenSesion: string }) {
  const [aviso, setAviso] = useState<AvisoViaje | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  // El socket no se vuelve a abrir al cambiar de pantalla: la ruta actual se lee desde una referencia
  const rutaActual = useRef(pathname + search)

  useEffect(() => {
    rutaActual.current = pathname + search
  }, [pathname, search])

  useEffect(() => {
    void sincronizarPush(tokenSesion)
    const dejarDeEscuchar = escucharAvisos(tokenSesion, (nuevo) => {
      if (rutaActual.current === rutaDeAviso(nuevo)) return
      setAviso(nuevo)
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => setAviso(null), DURACION_MS)
    })
    return () => {
      dejarDeEscuchar()
      window.clearTimeout(temporizador.current)
    }
  }, [tokenSesion])

  const cerrar = () => {
    window.clearTimeout(temporizador.current)
    setAviso(null)
  }

  const abrir = () => {
    if (!aviso) return
    cerrar()
    // Hasta que cambie la ruta, un aviso repetido que llegue ahora no debe volver a mostrarse
    rutaActual.current = rutaDeAviso(aviso)
    void navigate(rutaDeAviso(aviso))
  }

  if (!aviso) return null

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 448,
        boxSizing: "border-box",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "white",
        border: `1.5px solid ${C.border}`,
        borderRadius: RADIUS.md,
        padding: "8px 8px 8px 12px",
        boxShadow: SHADOWS.cardRaised,
        animation: "tw-toast-entra 0.25s ease-out",
      }}
    >
      <button
        type="button"
        onClick={abrir}
        aria-label={`${aviso.viaje_nombre}: ${aviso.texto}. Abrir`}
        style={{
          flex: 1,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img src={appLogo} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, fontFamily: NUNITO, minWidth: 0 }}>
          <div style={{ color: C.navy, fontSize: 13, fontWeight: 800 }}>{aviso.viaje_nombre}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 1.4, overflowWrap: "anywhere" }}>
            {aviso.texto}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar aviso"
        style={{
          background: "none",
          border: "none",
          minWidth: 36,
          minHeight: 36,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="close" size={16} color={C.muted} strokeWidth={2.4} />
      </button>
    </div>
  )
}
