import Icon from "./Icon"
import { C, NUNITO } from "../styles/tokens"

export type SeccionViaje = "gastos" | "itinerario" | "inicio" | "agenda" | "mas"

// Las secciones se activan a medida que se implementan (gastos, itinerario... en próximos sprints)
const SECCIONES:{ id: SeccionViaje; icono: string; texto: string; disponible: boolean }[] = [
  { id: "gastos", icono: "euro", texto: "Gastos", disponible: false },
  { id: "itinerario", icono: "calendar", texto: "Itinerario", disponible: true },
  { id: "inicio", icono: "home", texto: "Inicio", disponible: true },
  { id: "agenda", icono: "folder", texto: "Agenda", disponible: false },
  { id: "mas", icono: "chat", texto: "Más", disponible: false },
]

export const ALTO_BARRA_INFERIOR = 72

type BarraInferiorProps = {
  activa: SeccionViaje
  onCambiar?: (seccion: SeccionViaje) => void
}

// Barra de navegación inferior dentro de un viaje
export default function BarraInferior({ activa, onCambiar }: BarraInferiorProps) {
  return (
    <nav
      aria-label="Secciones del viaje"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        background: "white",
        borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          height: ALTO_BARRA_INFERIOR,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          boxSizing: "border-box",
        }}
      >
        {SECCIONES.map(({ id, icono, texto, disponible }) => {
          const esActiva = activa === id
          return (
            <button
              type="button"
              key={id}
              disabled={!disponible}
              aria-current={esActiva ? "page" : undefined}
              title={disponible ? undefined : "Disponible próximamente"}
              onClick={() => {
                if (!esActiva) onCambiar?.(id)
              }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                background: "transparent",
                border: "none",
                cursor: disponible ? "pointer" : "not-allowed",
                opacity: disponible ? 1 : 0.45,
                padding: "8px 0",
                position: "relative",
              }}
            >
              {esActiva && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 3,
                    borderRadius: "0 0 3px 3px",
                    background: C.blue,
                  }}
                />
              )}
              <Icon
                name={icono}
                size={22}
                color={esActiva ? C.blue : C.muted}
                strokeWidth={esActiva ? 2.2 : 1.6}
              />
              <span
                style={{
                  fontFamily: NUNITO,
                  fontSize: 10,
                  fontWeight: esActiva ? 800 : 500,
                  color: esActiva ? C.blue : C.muted,
                }}
              >
                {texto}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
