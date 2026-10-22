import Badge from "./Badge"
import { C, NUNITO } from "../styles/tokens"

type OpcionVotacionProps = {
  texto: string
  votos: number
  porcentaje: number
  seleccionada: boolean
  // Resalta la opción que va ganando
  destacada?: boolean
  // Texto pequeño a la derecha de los votos (p. ej. «Tu elección»)
  nota?: string
  deshabilitada?: boolean
  onSeleccionar?: () => void
}

// Opción de una votación: radio, porcentaje, barra de progreso y número de votos
export default function OpcionVotacion({
  texto,
  votos,
  porcentaje,
  seleccionada,
  destacada = false,
  nota,
  deshabilitada = false,
  onSeleccionar,
}: OpcionVotacionProps) {
  let borde = C.border
  if (seleccionada) borde = C.blue
  else if (destacada) borde = `${C.greenMid}60`

  let colorBarra = "#A0AEC0"
  if (seleccionada) colorBarra = C.blue
  else if (destacada) colorBarra = C.greenMid

  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      disabled={deshabilitada}
      onClick={onSeleccionar}
      style={{
        width: "100%",
        background: seleccionada ? C.lightBlue : C.bg,
        border: `2px solid ${borde}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        cursor: deshabilitada ? "default" : "pointer",
        textAlign: "left",
        transition: "all 0.2s",
        fontFamily: NUNITO,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              boxSizing: "border-box",
              border: `2.5px solid ${seleccionada ? C.blue : C.muted}`,
              background: seleccionada ? C.blue : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {seleccionada && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "white" }} />}
          </span>
          <span style={{ color: C.navy, fontSize: 14, fontWeight: 700 }}>{texto}</span>
          {destacada && (
            <Badge bg={C.greenBg} color={C.green}>
              Mayoría
            </Badge>
          )}
        </div>
        <span style={{ color: seleccionada ? C.blue : C.muted, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
          {porcentaje}%
        </span>
      </div>
      <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
        <div
          style={{
            background: colorBarra,
            borderRadius: 4,
            height: 6,
            width: `${porcentaje}%`,
            transition: "width 0.5s",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ color: C.muted, fontSize: 11 }}>
          {votos} {votos === 1 ? "voto" : "votos"}
        </span>
        {nota && <span style={{ color: C.blue, fontSize: 11, fontWeight: 700 }}>{nota}</span>}
      </div>
    </button>
  )
}
