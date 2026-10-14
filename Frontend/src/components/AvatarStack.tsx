import Avatar, { type Miembro } from "./Avatar"
import { NUNITO } from "../styles/tokens"

export default function AvatarStack({
  members,
  size = 30,
  max = 3,
}: {
  members: Miembro[]
  size?: number
  // Si hay más miembros que este máximo se muestran solo los primeros y un «+N» con los que faltan
  max?: number
}) {
  const visibles = members.slice(0, max)
  const ocultos = members.length - visibles.length

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visibles.map((m, i) => (
        <div
          key={`${m.name}-${i}`}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.33,
            zIndex: members.length - i,
          }}
        >
          <Avatar member={m} size={size} />
        </div>
      ))}
      {ocultos > 0 && (
        <div
          aria-label={`${ocultos} miembros más`}
          style={{
            marginLeft: -size * 0.33,
            width: size,
            height: size,
            borderRadius: "50%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.28)",
            border: "2px solid white",
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
            +{ocultos}
          </span>
        </div>
      )}
    </div>
  )
}
