import type { ReactNode } from "react"
import appLogo from "../assets/travelwrap-logo.png"
import { C, NUNITO } from "../styles/tokens"

type PortadaAccesoProps = {
  titulo: string
  subtitulo: string
  children: ReactNode
}

// Fondo azul, logo, título y subtítulo de las pantallas de acceso (Login y Registro), con su formulario debajo
export default function PortadaAcceso({ titulo, subtitulo, children }: PortadaAccesoProps) {
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.blue} 100%)`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              background: "white",
              width: 92,
              height: 92,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <img src={appLogo} alt="Logo de TravelWrap" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ fontFamily: NUNITO, fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1.15 }}>
            {titulo}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: NUNITO, marginTop: 8, fontSize: 15 }}>
            {subtitulo}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
