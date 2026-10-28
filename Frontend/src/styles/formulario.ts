// Estilos de los formularios (campos, etiquetas y avisos de error), compartidos por las pantallas que los usan
import type { CSSProperties } from "react"
import { C, NUNITO, RADIUS } from "./tokens"

// Campo de texto. 16 px de letra para que iOS no amplíe la pantalla al escribir
export const estiloCampo: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: RADIUS.md,
  padding: "13px 16px",
  fontFamily: NUNITO,
  fontSize: 16,
  color: C.navy,
  outline: "none",
  boxSizing: "border-box",
}

export const estiloEtiqueta: CSSProperties = {
  fontFamily: NUNITO,
  fontSize: 11,
  fontWeight: 700,
  color: C.muted,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 6,
  display: "block",
}

// Aviso de error en rojo
export const estiloAlerta: CSSProperties = {
  background: C.redBg,
  border: `1.5px solid ${C.red}55`,
  borderRadius: 12,
  padding: "10px 14px",
  color: C.red,
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 700,
}
