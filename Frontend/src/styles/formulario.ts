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

// Desplegable: sin la flecha nativa (pegada al borde) y con una propia, separada 16 px del lado derecho
const FLECHA_DESPLEGABLE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='${C.navy}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='1 1.5 6 6.5 11 1.5'/></svg>`,
)}")`

export const estiloDesplegable: CSSProperties = {
  ...estiloCampo,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: FLECHA_DESPLEGABLE,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: 40,
  cursor: "pointer",
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
