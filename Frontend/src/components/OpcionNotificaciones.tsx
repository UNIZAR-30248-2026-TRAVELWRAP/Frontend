import { useEffect, useState } from "react"
import Icon from "./Icon"
import { activarPush, desactivarPush, estadoPush, type EstadoPush } from "../services/pushNotificaciones"
import { C, NUNITO } from "../styles/tokens"

const AYUDA: Record<EstadoPush, string> = {
  activadas: "Recibirás un aviso del móvil con votaciones, gastos, tareas y mensajes nuevos",
  desactivadas: "Activa los avisos del móvil de tu viaje",
  bloqueadas: "Están bloqueadas en el navegador: permítelas en los ajustes del sitio",
  no_soportadas: "Este navegador no admite notificaciones push",
}

// Opción de «Mi Perfil» para activar o desactivar las notificaciones push en este dispositivo
export default function OpcionNotificaciones({ token }: { token: string }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    void estadoPush().then((actual) => {
      if (vigente) setEstado(actual)
    })
    return () => {
      vigente = false
    }
  }, [])

  const alternar = async () => {
    if (!estado) return
    setCambiando(true)
    setError("")
    try {
      setEstado(estado === "activadas" ? await desactivarPush(token) : await activarPush(token))
    } catch {
      setError("No se han podido cambiar las notificaciones. Inténtalo de nuevo.")
    } finally {
      setCambiando(false)
    }
  }

  if (!estado) return null
  const disponible = estado === "activadas" || estado === "desactivadas"

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        role="switch"
        aria-checked={estado === "activadas"}
        aria-label="Notificaciones push"
        onClick={() => void alternar()}
        disabled={!disponible || cambiando}
        style={{
          width: "100%",
          minHeight: 44,
          background: "white",
          border: `1.5px solid ${C.border}`,
          borderRadius: 18,
          padding: "14px 20px",
          cursor: disponible && !cambiando ? "pointer" : "not-allowed",
          opacity: disponible ? 1 : 0.7,
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          textAlign: "left",
        }}
      >
        <Icon name="bell" size={22} color={C.navy} strokeWidth={1.8} />
        <div style={{ flex: 1, fontFamily: NUNITO }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: 14 }}>Notificaciones push</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{AYUDA[estado]}</div>
        </div>
        <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 13, color: estado === "activadas" ? C.green : "#4A5568" }}>
          {estado === "activadas" ? "Activadas" : "Desactivadas"}
        </span>
      </button>
      {error && (
        <div role="alert" style={{ marginTop: 8, color: C.red, fontFamily: NUNITO, fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </div>
  )
}
