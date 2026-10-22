import { useState } from "react"
import type { Miembro } from "../components/Avatar"
import AvatarStack from "../components/AvatarStack"
import Badge from "../components/Badge"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import OpcionVotacion from "../components/OpcionVotacion"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { conPorcentajes, elegirAlAzar, opcionesGanadoras, type OpcionConVotos } from "../utils/votaciones"

// ─── Tipos y datos de ejemplo (se sustituirán por los del backend) ────────────
type TipoVotacion = "fecha" | "actividad" | "otro"

type Votacion = {
  id: string
  pregunta: string
  tipo: TipoVotacion
  estado: "abierta" | "cerrada"
  opciones: OpcionConVotos[]
  votantes: number
  totalMiembros: number
  ganadoraId?: string
}

const MIEMBROS_DEMO: Miembro[] = [
  { name: "Daniel", initial: "D", color: C.blue },
  { name: "Berta", initial: "B", color: C.green },
  { name: "Adriana", initial: "A", color: C.accent },
]

const VOTACIONES_DEMO: Votacion[] = [
  {
    id: "fechas-roma",
    pregunta: "¿Qué fin de semana preferimos para el viaje a Roma?",
    tipo: "fecha",
    estado: "abierta",
    opciones: [
      { id: "12-15-mayo", texto: "12 – 15 mayo", votos: 2 },
      { id: "19-22-mayo", texto: "19 – 22 mayo", votos: 0 },
    ],
    votantes: 2,
    totalMiembros: 3,
  },
  {
    id: "alojamiento",
    pregunta: "¿Qué tipo de alojamiento preferís?",
    tipo: "otro",
    estado: "cerrada",
    opciones: [
      { id: "airbnb", texto: "Airbnb compartido", votos: 2 },
      { id: "hotel", texto: "Hotel", votos: 1 },
    ],
    votantes: 3,
    totalMiembros: 3,
    ganadoraId: "airbnb",
  },
]

const FILTROS: { texto: string; tipo: TipoVotacion | null }[] = [
  { texto: "Todas", tipo: null },
  { texto: "Fechas", tipo: "fecha" },
  { texto: "Actividades", tipo: "actividad" },
]

// ─── Pantalla: Votaciones ─────────────────────────────────────────────────────
type VotacionesProps = {
  onVolver?: () => void
  onCrearVotacion?: () => void
}

export default function Votaciones({ onVolver, onCrearVotacion }: VotacionesProps) {
  const [filtro, setFiltro] = useState<TipoVotacion | null>(null)
  const [votaciones, setVotaciones] = useState(VOTACIONES_DEMO)
  // Opción marcada en cada votación y voto ya emitido en cada una
  const [seleccion, setSeleccion] = useState<Record<string, string>>({})
  const [misVotos, setMisVotos] = useState<Record<string, string>>({})

  const visibles = votaciones.filter((v) => filtro === null || v.tipo === filtro)
  const abiertas = visibles.filter((v) => v.estado === "abierta")
  const cerradas = visibles.filter((v) => v.estado === "cerrada")

  const emitirVoto = (votacion: Votacion) => {
    const nueva = seleccion[votacion.id]
    const anterior = misVotos[votacion.id]
    if (!nueva || nueva === anterior) return
    setVotaciones((lista) =>
      lista.map((v) =>
        v.id !== votacion.id
          ? v
          : {
              ...v,
              votantes: anterior ? v.votantes : v.votantes + 1,
              opciones: v.opciones.map((o) => {
                if (o.id === nueva) return { ...o, votos: o.votos + 1 }
                if (o.id === anterior) return { ...o, votos: o.votos - 1 }
                return o
              }),
            },
      ),
    )
    setMisVotos((votos) => ({ ...votos, [votacion.id]: nueva }))
  }

  // Al cerrar gana la opción más votada; si hay empate, una al azar
  const cerrarVotacion = (votacion: Votacion) => {
    const ganadoras = opcionesGanadoras(votacion.opciones)
    setVotaciones((lista) =>
      lista.map((v) =>
        v.id === votacion.id
          ? { ...v, estado: "cerrada", ganadoraId: ganadoras.length ? elegirAlAzar(ganadoras).id : undefined }
          : v,
      ),
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera con filtros */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 22px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={onVolver}
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
              }}
            >
              <Icon name="arrow_left" size={20} color="white" strokeWidth={2.5} />
            </button>
            <Heading size={22} color="white">
              Votaciones
            </Heading>
          </div>
          <div role="tablist" aria-label="Filtrar votaciones" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {FILTROS.map(({ texto, tipo }) => {
              const activo = filtro === tipo
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  key={texto}
                  onClick={() => setFiltro(tipo)}
                  style={{
                    background: activo ? "white" : "rgba(255,255,255,0.18)",
                    color: activo ? C.blue : "rgba(255,255,255,0.85)",
                    border: "none",
                    borderRadius: 999,
                    padding: "7px 16px",
                    fontFamily: NUNITO,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                  }}
                >
                  {texto}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ padding: "16px 16px 28px" }}>
          <button
            type="button"
            onClick={onCrearVotacion}
            style={{
              width: "100%",
              background: C.blue,
              color: "white",
              border: "none",
              borderRadius: RADIUS.md,
              padding: 13,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              boxShadow: SHADOWS.button,
            }}
          >
            <Icon name="plus" size={16} color="white" strokeWidth={2.5} />
            Crear nueva votación
          </button>

          {visibles.length === 0 && (
            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No hay votaciones de este tipo todavía.
            </div>
          )}

          {/* Votaciones abiertas */}
          {abiertas.map((votacion) => {
            const opciones = conPorcentajes(votacion.opciones)
            const marcada = seleccion[votacion.id]
            const emitido = misVotos[votacion.id]
            const yaVotado = marcada !== undefined && marcada === emitido
            const completa = votacion.votantes >= votacion.totalMiembros
            return (
              <section
                key={votacion.id}
                aria-label={votacion.pregunta}
                style={{
                  background: "white",
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  boxShadow: SHADOWS.cardRaised,
                  marginBottom: 14,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <div style={{ marginBottom: 10 }}>
                    <Badge bg={C.greenBg} color={C.green}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.greenMid, display: "inline-block" }} />
                      Votación activa
                    </Badge>
                  </div>
                  <Heading size={15}>{votacion.pregunta}</Heading>
                </div>

                <div role="radiogroup" aria-label="Opciones">
                  {opciones.map((opcion) => (
                    <OpcionVotacion
                      key={opcion.id}
                      texto={opcion.texto}
                      votos={opcion.votos}
                      porcentaje={opcion.porcentaje}
                      seleccionada={marcada === opcion.id}
                      nota={emitido === opcion.id ? "Tu elección" : undefined}
                      onSeleccionar={() => setSeleccion((s) => ({ ...s, [votacion.id]: opcion.id }))}
                    />
                  ))}
                </div>

                {/* Quién ha votado */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: C.bg,
                    borderRadius: 12,
                    marginBottom: 14,
                  }}
                >
                  <AvatarStack members={MIEMBROS_DEMO} size={22} />
                  <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, flex: 1 }}>
                    <strong style={{ color: C.navy }}>
                      {votacion.votantes}/{votacion.totalMiembros}
                    </strong>{" "}
                    miembros han votado
                  </span>
                  {completa && (
                    <Badge bg={C.greenBg} color={C.green}>
                      Completo
                    </Badge>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => emitirVoto(votacion)}
                    disabled={!marcada || yaVotado}
                    style={{
                      flex: 1,
                      background: C.blue,
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      padding: 12,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: !marcada || yaVotado ? "default" : "pointer",
                      opacity: marcada ? 1 : 0.6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: SHADOWS.button,
                    }}
                  >
                    {yaVotado ? (
                      <>
                        <Icon name="check" size={15} color="white" strokeWidth={2.5} />
                        Voto emitido
                      </>
                    ) : emitido ? (
                      "Cambiar voto"
                    ) : (
                      "Emitir voto"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => cerrarVotacion(votacion)}
                    style={{
                      flex: 1,
                      background: C.redBg,
                      color: C.red,
                      border: `1.5px solid ${C.red}`,
                      borderRadius: 12,
                      padding: 12,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cerrar votación
                  </button>
                </div>
              </section>
            )
          })}

          {/* Votaciones cerradas */}
          {cerradas.map((votacion) => {
            const opciones = conPorcentajes(votacion.opciones)
            const ganadora = opciones.find((o) => o.id === votacion.ganadoraId)
            return (
              <section
                key={votacion.id}
                aria-label={votacion.pregunta}
                style={{
                  background: "white",
                  borderRadius: 20,
                  padding: 18,
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${C.border}`,
                  opacity: 0.75,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Heading size={13}>{votacion.pregunta}</Heading>
                  <Badge bg={C.bg} color={C.muted}>
                    Cerrada
                  </Badge>
                </div>
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {ganadora ? (
                    <>
                      <Icon name="check" size={14} color={C.greenMid} strokeWidth={2.5} />
                      Ganó: <strong style={{ color: C.navy }}>{ganadora.texto}</strong> ({ganadora.porcentaje}%)
                    </>
                  ) : (
                    "Se cerró sin votos"
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
