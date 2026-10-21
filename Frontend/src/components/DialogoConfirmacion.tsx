import type { ReactNode } from "react"
import Heading from "./Heading"
import Icon from "./Icon"
import { C, NUNITO } from "../styles/tokens"

type DialogoConfirmacionProps = {
  titulo: string
  children: ReactNode
  icono: string
  // Color de la acción: rojo para borrar, naranja para cerrar el viaje...
  color: string
  colorFondo: string
  textoConfirmar: string
  textoConfirmando: string
  // Mientras se ejecuta la acción los botones se desactivan
  ocupado?: boolean
  error?: string
  onConfirmar: () => void
  onCancelar: () => void
}

// Ventana para confirmar una acción que no se puede deshacer
export default function DialogoConfirmacion({
  titulo,
  children,
  icono,
  color,
  colorFondo,
  textoConfirmar,
  textoConfirmando,
  ocupado = false,
  error,
  onConfirmar,
  onCancelar,
}: DialogoConfirmacionProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(13,31,60,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        style={{
          width: "100%",
          maxWidth: 436,
          background: "white",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: colorFondo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Icon name={icono} size={23} color={color} strokeWidth={2} />
        </div>
        <div id="dialogo-confirmacion-titulo">
          <Heading size={20}>{titulo}</Heading>
        </div>
        <div
          style={{
            fontFamily: NUNITO,
            color: C.muted,
            fontSize: 13,
            lineHeight: 1.5,
            marginTop: 8,
            marginBottom: error ? 12 : 20,
          }}
        >
          {children}
        </div>
        {error && (
          <div
            role="alert"
            style={{
              background: C.redBg,
              border: `1.5px solid ${C.red}55`,
              borderRadius: 12,
              padding: "10px 14px",
              color: C.red,
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancelar}
            disabled={ocupado}
            style={{
              flex: 1,
              border: `1.5px solid ${C.border}`,
              borderRadius: 13,
              background: "white",
              color: C.navy,
              padding: 12,
              fontFamily: NUNITO,
              fontWeight: 800,
              cursor: ocupado ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={ocupado}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 13,
              background: color,
              color: "white",
              padding: 12,
              fontFamily: NUNITO,
              fontWeight: 800,
              cursor: ocupado ? "not-allowed" : "pointer",
              opacity: ocupado ? 0.7 : 1,
            }}
          >
            {ocupado ? textoConfirmando : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
