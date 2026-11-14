import Icon from "./Icon"
import type { DisenoSello } from "../services/sellosApi"
import { NUNITO } from "../styles/tokens"
import { infoDeDiseno, textoDelSello } from "../utils/sellos"

type SelloProps = {
  diseno: DisenoSello
  destino: string
  anio?: number | string | null
  // Posición en la rejilla: decide hacia qué lado se gira el sello
  indice?: number
  compacto?: boolean
}

// Sello de viaje: borde discontinuo, icono y el destino con el año
export default function Sello({ diseno, destino, anio, indice = 0, compacto = false }: SelloProps) {
  const { color, fondo, icono } = infoDeDiseno(diseno)
  const texto = textoDelSello(destino, anio)

  return (
    <div
      role="img"
      aria-label={`Sello de ${texto}`}
      style={{
        background: fondo,
        padding: 8,
        border: `2px dashed ${color}`,
        boxShadow: `0 0 0 4px ${fondo}, 0 3px 10px rgba(0,0,0,0.08)`,
        transform: `rotate(${indice % 2 === 0 ? -2 : 2}deg)`,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          minHeight: compacto ? 56 : 92,
          border: `1px solid ${color}55`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compacto ? 3 : 7,
          padding: "4px 6px",
          boxSizing: "border-box",
        }}
      >
        <Icon name={icono} size={compacto ? 20 : 28} color={color} strokeWidth={1.7} />
        <div
          style={{
            fontFamily: NUNITO,
            fontWeight: 900,
            color,
            fontSize: compacto ? 10 : 12,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          {texto}
        </div>
      </div>
    </div>
  )
}

