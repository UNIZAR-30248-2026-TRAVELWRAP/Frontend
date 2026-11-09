import { useEffect, useRef } from "react"
import Icon from "./Icon"
import { NUNITO } from "../styles/tokens"

export type FotoVisor = { id: string; url: string; nombre: string }

type VisorFotosProps = {
  fotos: FotoVisor[]
  indice: number
  onCambiar: (indice: number) => void
  onCerrar: () => void
}

const estiloBoton = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
} as const

export default function VisorFotos({ fotos, indice, onCambiar, onCerrar }: VisorFotosProps) {
  const botonCerrar = useRef<HTMLButtonElement>(null)
  const foto = fotos[indice]
  const hayAnterior = indice > 0
  const haySiguiente = indice < fotos.length - 1

  useEffect(() => {
    botonCerrar.current?.focus()
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = desbordeAnterior
    }
  }, [])

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar()
      else if (evento.key === "ArrowLeft" && hayAnterior) onCambiar(indice - 1)
      else if (evento.key === "ArrowRight" && haySiguiente) onCambiar(indice + 1)
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [indice, hayAnterior, haySiguiente, onCambiar, onCerrar])

  if (!foto) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${indice + 1} de ${fotos.length}: ${foto.nombre}`}
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        zIndex: 60,
        background: "rgba(8,16,32,0.96)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", gap: 12 }}>
        <span
          style={{
            fontFamily: NUNITO,
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {indice + 1} de {fotos.length}
        </span>
        <button ref={botonCerrar} type="button" onClick={onCerrar} aria-label="Cerrar foto" style={estiloBoton}>
          <Icon name="close" size={20} color="white" strokeWidth={2.2} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 8px 16px" }}>
        <button
          type="button"
          onClick={() => onCambiar(indice - 1)}
          disabled={!hayAnterior}
          aria-label="Foto anterior"
          style={{ ...estiloBoton, opacity: hayAnterior ? 1 : 0.3, cursor: hayAnterior ? "pointer" : "default" }}
        >
          <Icon name="arrow_left" size={20} color="white" strokeWidth={2.2} />
        </button>
        <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={foto.url}
            alt={foto.nombre}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", borderRadius: 8 }}
          />
        </div>
        <button
          type="button"
          onClick={() => onCambiar(indice + 1)}
          disabled={!haySiguiente}
          aria-label="Foto siguiente"
          style={{ ...estiloBoton, opacity: haySiguiente ? 1 : 0.3, cursor: haySiguiente ? "pointer" : "default" }}
        >
          <Icon name="arrow_right" size={20} color="white" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
