import { C, NUNITO } from "../styles/tokens"
import Icon from "./Icon"

export type OpcionPestana = { id: string; texto: string; icono?: string }

type PestanasCabeceraProps = {
  etiqueta: string
  opciones: OpcionPestana[]
  seleccionada: string
  onChange: (id: string) => void
}

// Selector de pestañas de las cabeceras: mismo tamaño y mismo aspecto en toda la app.
// Al cambiar de pestaña la pantalla vuelve arriba, para que siempre se vea la cabecera
export default function PestanasCabecera({ etiqueta, opciones, seleccionada, onChange }: PestanasCabeceraProps) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      style={{ display: "flex", background: "rgba(255,255,255,0.14)", borderRadius: 12, padding: 4, gap: 4 }}
    >
      {opciones.map((opcion) => {
        const activa = opcion.id === seleccionada
        const color = activa ? C.blue : "rgba(255,255,255,0.8)"
        return (
          <button
            type="button"
            role="tab"
            key={opcion.id}
            aria-selected={activa}
            onClick={() => {
              if (activa) return
              window.scrollTo({ top: 0 })
              onChange(opcion.id)
            }}
            style={{
              flex: 1,
              minHeight: 40,
              border: "none",
              borderRadius: 9,
              padding: "8px 6px",
              background: activa ? "white" : "transparent",
              color,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 13,
              cursor: activa ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {opcion.icono && <Icon name={opcion.icono} size={14} color={color} strokeWidth={2} />}
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}
