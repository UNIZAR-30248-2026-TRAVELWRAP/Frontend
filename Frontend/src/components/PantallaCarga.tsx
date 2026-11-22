import { useEffect, useState } from "react"
import { C, GRADIENTS, NUNITO } from "../styles/tokens"

const RETRASO_AVISO_MS = 3000

export default function PantallaCarga() {
  const [tardando, setTardando] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => setTardando(true), RETRASO_AVISO_MS)
    return () => clearTimeout(temporizador)
  }, [])

  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        boxSizing: "border-box",
        background: GRADIENTS.hero,
        color: "#FFFFFF",
        fontFamily: NUNITO,
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        className="tw-spinner"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "4px solid rgba(255,255,255,0.3)",
          borderTopColor: C.accent,
        }}
      />
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>TravelWrap</h1>
      <p style={{ margin: 0, fontSize: 14, minHeight: 40, maxWidth: 280, opacity: 0.9 }}>
        {tardando
          ? "Conectando con el servidor, puede tardar unos segundos..."
          : "Cargando..."}
      </p>
    </main>
  )
}
