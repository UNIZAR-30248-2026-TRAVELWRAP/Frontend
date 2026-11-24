import type { ReactNode } from "react"
import { C, NUNITO } from "../styles/tokens"
import Icon from "./Icon"

type EstadoVacioProps = {
  icono: string
  children: ReactNode
}

// Lo que se ve cuando una lista todavía no tiene nada: un icono y una frase clara, sin una línea de texto suelta
export default function EstadoVacio({ icono, children }: EstadoVacioProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 16px", textAlign: "center" }}>
      <div
        aria-hidden="true"
        style={{ width: 56, height: 56, borderRadius: "50%", background: C.lightBlue, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={icono} size={26} color={C.blue} strokeWidth={1.8} />
      </div>
      <p style={{ margin: 0, fontFamily: NUNITO, color: C.muted, fontSize: 13, maxWidth: 260 }}>{children}</p>
    </div>
  )
}
