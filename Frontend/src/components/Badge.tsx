import type { ReactNode } from "react"
import { NUNITO } from "../styles/tokens"

export default function Badge({
  children,
  bg,
  color,
}: {
  children: ReactNode
  bg: string
  color: string
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: bg,
        color,
        borderRadius: 7,
        padding: "3px 9px",
        fontSize: 10,
        fontWeight: 700,
        fontFamily: NUNITO,
      }}
    >
      {children}
    </div>
  )
}
