import type { Actividad } from "../services/actividadesApi"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { etiquetaCuandoEmpieza, etiquetaDia } from "../utils/actividadEnCurso"
import Badge from "./Badge"
import Icon from "./Icon"

type TarjetaProximaActividadProps = {
  actividad: Actividad
  ahora: Date
}

// La siguiente actividad del viaje, con la hora y cuánto falta para que empiece
export default function TarjetaProximaActividad({ actividad, ahora }: TarjetaProximaActividadProps) {
  return (
    <section
      aria-label="Próxima actividad"
      style={{
        background: "#FFF4E8",
        borderRadius: RADIUS.lg,
        padding: "10px 12px",
        border: "1.5px solid #F6C48F",
        boxShadow: SHADOWS.cardSoft,
      }}
    >
      <div
        style={{
          color: C.accent,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: NUNITO,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Próxima actividad
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="pin" size={20} color={C.accent} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: NUNITO, fontSize: 14, fontWeight: 800, color: C.navy, overflowWrap: "anywhere" }}>
            {actividad.titulo}
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              fontFamily: NUNITO,
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon name="clock" size={11} color={C.muted} strokeWidth={2} />
            {actividad.hora_inicio?.slice(0, 5)} h · {etiquetaDia(actividad.fecha, ahora)}
          </div>
        </div>
        <Badge bg="white" color={C.accent}>
          {etiquetaCuandoEmpieza(actividad, ahora)}
        </Badge>
      </div>
    </section>
  )
}
