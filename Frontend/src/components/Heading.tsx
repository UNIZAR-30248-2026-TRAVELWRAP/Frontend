import type { ReactNode } from "react"
import { C, NUNITO } from "../styles/tokens"

export default function Heading({
  children,
  size = 22,
  color = C.navy,
}: {
  children: ReactNode
  size?: number
  color?: string
}) {
  return (
    <div
      style={{
        fontFamily: NUNITO,
        fontSize: size,
        fontWeight: 800,
        color,
        lineHeight: 1.15,
      }}
    >
      {children}
    </div>
  )
}
