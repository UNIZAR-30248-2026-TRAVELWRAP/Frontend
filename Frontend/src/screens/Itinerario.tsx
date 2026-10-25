import { useEffect, useState, type CSSProperties } from "react"
import Badge from "../components/Badge"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import type { Actividad } from "../services/actividadesApi"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { diasDelViaje } from "../utils/formatoViaje"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const alertaStyle: CSSProperties = {
  background: C.redBg,
  border: `1.5px solid ${C.red}55`,
  borderRadius: 12,
  padding: "10px 14px",
  color: C.red,
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 700,
}

const avisoVacioStyle: CSSProperties = {
  fontFamily: NUNITO,
  color: C.muted,
  fontSize: 13,
  textAlign: "center",
  padding: "24px 0",
}

type ItinerarioProps = {
  viajeId: string
  tokenSesion: string
  actividades?: Actividad[]
  onVolver?: () => void
  onAnadirActividad?: () => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function Itinerario({
  viajeId,
  tokenSesion,
  actividades = [],
  onVolver,
  onAnadirActividad,
  onCambiarSeccion,
}: ItinerarioProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [error, setError] = useState("")
  const [diaElegido, setDiaElegido] = useState("")

  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (vigente) setViaje(datos)
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const dias = viaje?.fecha_inicio && viaje.fecha_fin ? diasDelViaje(viaje.fecha_inicio, viaje.fecha_fin) : []
  const dia = dias.some((d) => d.fecha === diaElegido) ? diaElegido : (dias[0]?.fecha ?? "")
  const delDia = actividades.filter((actividad) => actividad.fecha === dia)
  const activo = viaje?.estado === "activo"

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 22px", borderRadius: RADIUS.header }}>
          <div style={{ marginBottom: dias.length > 0 ? 16 : 0 }}>
            <button
              type="button"
              onClick={onVolver}
              aria-label="Volver a Mis Viajes"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 4,
              }}
            >
              <Icon name="arrow_left" size={13} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
              <span
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: NUNITO,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Mis Viajes
              </span>
            </button>
            <Heading size={22} color="white">
              Itinerario
            </Heading>
          </div>
          {dias.length > 0 && (
            <div role="group" aria-label="Día del itinerario" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {dias.map((d) => {
                const activa = dia === d.fecha
                return (
                  <button
                    type="button"
                    key={d.fecha}
                    aria-pressed={activa}
                    onClick={() => setDiaElegido(d.fecha)}
                    style={{
                      background: activa ? "white" : "rgba(255,255,255,0.18)",
                      color: activa ? C.blue : "rgba(255,255,255,0.85)",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 16px",
                      fontFamily: NUNITO,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      flexShrink: 0,
                      boxShadow: activa ? "0 2px 10px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    {d.texto}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...alertaStyle, marginBottom: 14 }}>
              No se ha podido cargar el viaje: {error}
            </div>
          )}

          {viaje && activo && (
            <button
              type="button"
              onClick={onAnadirActividad}
              style={{
                width: "100%",
                background: "white",
                color: C.blue,
                border: `1.5px dashed ${C.blue}`,
                borderRadius: 14,
                padding: 12,
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="plus" size={16} color={C.blue} strokeWidth={2.5} />
              Añadir Actividad
            </button>
          )}

          {viaje && dias.length === 0 && (
            <div style={avisoVacioStyle}>
              Este viaje aún no tiene fechas: añádelas al editar el viaje para organizar el itinerario por días.
            </div>
          )}

          {dias.length > 0 && (
            <>
              <SectionLabel>Agenda del día</SectionLabel>
              {delDia.length === 0 ? (
                <div style={avisoVacioStyle}>No hay actividades este día.</div>
              ) : (
                <div role="list" aria-label="Agenda del día" style={{ position: "relative", paddingBottom: 28 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 20,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: `linear-gradient(to bottom, ${C.blue}, ${C.border})`,
                    }}
                  />
                  {delDia.map((actividad, indice) => {
                    const primera = indice === 0
                    return (
                      <div
                        role="listitem"
                        key={actividad.id}
                        style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: primera ? C.accent : "white",
                            border: `2.5px solid ${primera ? C.accent : C.blue}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            zIndex: 1,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Icon name="pin" size={18} color={primera ? "white" : C.blue} strokeWidth={1.8} />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: "white",
                            borderRadius: 16,
                            padding: "12px 14px",
                            boxShadow: SHADOWS.card,
                            border: `1.5px solid ${primera ? `${C.accent}50` : C.border}`,
                          }}
                        >
                          <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                            {actividad.titulo}
                          </div>
                          {actividad.ubicacion_nombre && (
                            <div
                              style={{
                                fontFamily: NUNITO,
                                color: C.muted,
                                fontSize: 11,
                                marginTop: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Icon name="pin" size={11} color={C.muted} strokeWidth={2} />
                              <span style={{ overflowWrap: "anywhere" }}>{actividad.ubicacion_nombre}</span>
                            </div>
                          )}
                          {actividad.hora_inicio && (
                            <div style={{ marginTop: 8 }}>
                              <Badge bg={primera ? C.lightAccent : C.lightBlue} color={primera ? C.accent : C.blue}>
                                <Icon name="clock" size={11} color={primera ? C.accent : C.blue} strokeWidth={2} />
                                {actividad.hora_inicio.slice(0, 5)} h
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BarraInferior activa="itinerario" onCambiar={onCambiarSeccion} />
    </div>
  )
}
