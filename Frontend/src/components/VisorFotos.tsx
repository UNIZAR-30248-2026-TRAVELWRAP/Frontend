import { useEffect, useRef, useState, type PointerEvent } from "react"
import Icon from "./Icon"
import { NUNITO } from "../styles/tokens"

export type FotoVisor = { id: string; url: string; nombre: string; descripcion?: string; esVideo?: boolean }

type VisorFotosProps = {
  fotos: FotoVisor[]
  indice: number
  onCambiar: (indice: number) => void
  onCerrar: () => void
  onBorrar?: () => void
}

const FRACCION_PARA_CAMBIAR = 0.2
const UMBRAL_ARRASTRE_PX = 8
const DURACION_AJUSTE_MS = 180

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

export default function VisorFotos({ fotos, indice, onCambiar, onCerrar, onBorrar }: VisorFotosProps) {
  const botonCerrar = useRef<HTMLButtonElement>(null)
  const foto = fotos[indice]
  const hayAnterior = indice > 0
  const haySiguiente = indice < fotos.length - 1
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [soltado, setSoltado] = useState(false)
  const pulsacion = useRef<{ x: number; arrastrando: boolean; delta: number } | null>(null)
  const sinMovimiento = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const conResistencia = (desplazado: number) => ((desplazado > 0 && !hayAnterior) || (desplazado < 0 && !haySiguiente) ? desplazado / 3 : desplazado)

  const alPulsar = (evento: PointerEvent<HTMLDivElement>) => {
    if (evento.button > 0) return
    pulsacion.current = { x: evento.clientX, arrastrando: false, delta: 0 }
    setSoltado(false)
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
  }

  const alMover = (evento: PointerEvent<HTMLDivElement>) => {
    const actual = pulsacion.current
    if (!actual) return
    const desplazado = evento.clientX - actual.x
    if (!actual.arrastrando && Math.abs(desplazado) > UMBRAL_ARRASTRE_PX) actual.arrastrando = true
    if (!actual.arrastrando) return
    actual.delta = conResistencia(desplazado)
    setDesplazamiento(actual.delta)
  }

  const alSoltar = (evento: PointerEvent<HTMLDivElement>) => {
    const actual = pulsacion.current
    pulsacion.current = null
    if (!actual?.arrastrando) return
    const umbral = evento.currentTarget.getBoundingClientRect().width * FRACCION_PARA_CAMBIAR
    setSoltado(true)
    setDesplazamiento(0)
    if (actual.delta <= -umbral && haySiguiente) onCambiar(indice + 1)
    else if (actual.delta >= umbral && hayAnterior) onCambiar(indice - 1)
  }

  const alCancelar = () => {
    pulsacion.current = null
    setSoltado(true)
    setDesplazamiento(0)
  }

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
      else if (evento.target instanceof HTMLVideoElement) return
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
      aria-label={`${foto.esVideo ? "Vídeo" : "Foto"} ${indice + 1} de ${fotos.length}: ${foto.nombre}`}
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
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {onBorrar && (
            <button type="button" onClick={onBorrar} aria-label={foto.esVideo ? "Borrar vídeo" : "Borrar foto"} style={estiloBoton}>
              <Icon name="trash" size={20} color="white" strokeWidth={2.2} />
            </button>
          )}
          <button ref={botonCerrar} type="button" onClick={onCerrar} aria-label="Cerrar foto" style={estiloBoton}>
            <Icon name="close" size={20} color="white" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 8px 8px" }}>
        <button
          type="button"
          onClick={() => onCambiar(indice - 1)}
          disabled={!hayAnterior}
          aria-label="Foto anterior"
          style={{ ...estiloBoton, opacity: hayAnterior ? 1 : 0.3, cursor: hayAnterior ? "pointer" : "default" }}
        >
          <Icon name="arrow_left" size={20} color="white" strokeWidth={2.2} />
        </button>
        <div
          data-testid="zona-foto"
          onPointerDown={foto.esVideo ? undefined : alPulsar}
          onPointerMove={foto.esVideo ? undefined : alMover}
          onPointerUp={foto.esVideo ? undefined : alSoltar}
          onPointerCancel={foto.esVideo ? undefined : alCancelar}
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "pan-y",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          {foto.esVideo ? (
            <video
              key={foto.id}
              src={foto.url}
              controls
              playsInline
              preload="metadata"
              aria-label={foto.nombre}
              style={{ maxWidth: "100%", maxHeight: "100%", display: "block", borderRadius: 8, background: "black" }}
            />
          ) : (
          <img
            src={foto.url}
            alt={foto.nombre}
            draggable={false}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
              borderRadius: 8,
              transform: `translateX(${desplazamiento}px)`,
              transition: soltado && !sinMovimiento ? `transform ${DURACION_AJUSTE_MS}ms ease-out` : "none",
            }}
          />
          )}
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
      <p
        style={{
          fontFamily: NUNITO,
          color: "rgba(255,255,255,0.85)",
          fontSize: 13,
          fontWeight: 700,
          textAlign: "center",
          margin: 0,
          padding: "0 16px 20px",
          minHeight: 18,
          overflowWrap: "anywhere",
        }}
      >
        {foto.descripcion}
      </p>
    </div>
  )
}
