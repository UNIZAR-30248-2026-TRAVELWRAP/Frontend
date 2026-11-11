import { useEffect, useState } from "react"
import { NUNITO } from "../styles/tokens"

export type Miembro = {
  name: string
  initial: string
  color: string
  // Foto de perfil; si falta o no carga, se ve la inicial
  imageUrl?: string | null
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
  const [fallo, setFallo] = useState(false)
  useEffect(() => setFallo(false), [member.imageUrl])
  const mostrarFoto = Boolean(member.imageUrl) && !fallo

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
        overflow: "hidden",
      }}
    >
      {mostrarFoto ? (
        <img
          src={member.imageUrl ?? undefined}
          alt=""
          onError={() => setFallo(true)}
          style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "50%" }}
        />
      ) : (
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
      )}
    </div>
  )
}
