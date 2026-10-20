import { useEffect, useRef, useState } from "react"
import Icon from "./Icon"
import { alSinConexion } from "../services/avisosRed"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"

const DURACION_MS = 6000

// Toast global: aparece cuando una petición no consigue conectar con el servidor.
// Se monta una sola vez en la raíz de la aplicación y sirve para todas las pantallas.
export default function AvisoConexion() {
  const [visible, setVisible] = useState(false)
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => {
    const dejarDeEscuchar = alSinConexion(() => {
      // Si fallan varias peticiones seguidas solo hay un aviso, que reinicia su cuenta atrás
      setVisible(true)
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => setVisible(false), DURACION_MS)
    })
    return () => {
      dejarDeEscuchar()
      window.clearTimeout(temporizador.current)
    }
  }, [])

  const cerrar = () => {
    window.clearTimeout(temporizador.current)
    setVisible(false)
  }

  if (!visible) return null

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
        gap: 12,
        background: C.redBg,
        border: `1.5px solid ${C.red}55`,
        borderRadius: RADIUS.md,
        padding: "12px 14px",
        boxShadow: SHADOWS.cardRaised,
        animation: "tw-toast-entra 0.25s ease-out",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="wifi" size={18} color={C.red} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, fontFamily: NUNITO }}>
        <div style={{ color: C.red, fontSize: 13, fontWeight: 800 }}>Sin conexión con el servidor</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>
          No se han podido cargar los datos. Inténtalo de nuevo en unos segundos.
        </div>
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar aviso"
        style={{
          background: "none",
          border: "none",
          padding: 6,
          cursor: "pointer",
          display: "flex",
          flexShrink: 0,
        }}
      >
        <Icon name="close" size={16} color={C.muted} strokeWidth={2.4} />
      </button>
    </div>
  )
}
