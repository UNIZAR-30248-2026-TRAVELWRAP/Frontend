import Icon from "./Icon"

// Botón «Volver» de las cabeceras azules de las pantallas
export default function BotonVolver({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver"
      style={{
        background: "rgba(255,255,255,0.18)",
        border: "none",
        borderRadius: 12,
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
    </button>
  )
}
