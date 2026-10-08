import { NUNITO } from "../styles/tokens"

export type Miembro = {
  name: string
  initial: string
  color: string
}

export default function Avatar({
  member,
  size = 32,
  showBorder = true,
}: {
  member: Miembro
  size?: number
  showBorder?: boolean
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: member.color,
        border: showBorder ? "2px solid white" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: size * 0.36,
          fontWeight: 800,
          fontFamily: NUNITO,
          lineHeight: 1,
        }}
      >
        {member.initial}
      </span>
    </div>
  )
}
