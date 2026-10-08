import type { ReactNode } from "react"
import { C, NUNITO } from "../styles/tokens"

export default function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        color: C.muted,
        fontFamily: NUNITO,
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}
