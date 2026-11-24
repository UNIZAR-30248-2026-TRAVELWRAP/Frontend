import Icon from "./Icon"
import { NUNITO } from "../styles/tokens"

type BotonVolverProps = {
  onClick?: () => void
  // Nombre accesible del botón (por ejemplo, «Volver a Mis Viajes»)
  etiqueta?: string
  // Texto discreto junto a la flecha, en mayúsculas (por ejemplo, «Mis Viajes»)
  texto?: string
}

// Flecha de volver discreta de las cabeceras: pequeña, tenue y sin caja, igual en todas las pantallas
export default function BotonVolver({ onClick, etiqueta = "Volver", texto }: BotonVolverProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "12px 12px 12px 0",
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
      }}
    >
      <Icon name="arrow_left" size={13} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
      {texto && (
        <span
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: NUNITO,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {texto}
        </span>
      )}
    </button>
  )
}
