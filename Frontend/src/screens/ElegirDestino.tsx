import { useEffect, useState } from "react"
import AvatarStack from "../components/AvatarStack"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import OpcionVotacion from "../components/OpcionVotacion"
import ProponerOpcion from "../components/ProponerOpcion"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import {
  cerrarVotacion,
  listarVotaciones,
  obtenerVotacion,
  proponerOpcion,
  votar,
  type Votacion,
} from "../services/votacionesApi"
import { escucharVotaciones } from "../services/votacionesTiempoReal"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { conPorcentajes, enumerar, opcionesGanadoras } from "../utils/votaciones"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// ─── Pantalla: Elegir destino ─────────────────────────────────────────────────
// Es lo único que se ve de un viaje pendiente de destino: su votación de destino, que se abre al crear el viaje.
// Los miembros proponen destinos y votan; el creador la cierra y el destino ganador queda fijado en el viaje.
type ElegirDestinoProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onInvitar?: () => void
  // El destino ya está fijado (ahora o antes de entrar): se pasa al inicio del viaje
  onDestinoFijado?: (viaje: ViajeDelUsuario) => void
}

export default function ElegirDestino({ viajeId, tokenSesion, onVolver, onInvitar, onDestinoFijado }: ElegirDestinoProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [votacion, setVotacion] = useState<Votacion | null>(null)
  const [error, setError] = useState("")
  const [votando, setVotando] = useState(false)
  const [errorVoto, setErrorVoto] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [fijando, setFijando] = useState(false)
  const [errorFijar, setErrorFijar] = useState("")

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarVotaciones(viajeId, tokenSesion, { tipo: "destino" })])
      .then(([datosViaje, { votaciones }]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setVotacion(votaciones[0] ?? null)
        if (datosViaje.pendiente_destino && !votaciones[0]) setError("No se ha encontrado la votación del destino")
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Tiempo real: los votos y propuestas de los demás aparecen sin recargar, y cuando el creador fija el destino
  // todos pasan al inicio del viaje
  useEffect(
    () =>
      escucharVotaciones(viajeId, tokenSesion, (cambio) => {
        if (cambio.motivo === "cerrada" && cambio.destino) {
          const destino = cambio.destino
          // Si ya estaba fijado (lo ha fijado este mismo usuario) no se cambia, para no volver a redirigir
          setViaje((actual) =>
            actual?.pendiente_destino ? { ...actual, destino, pendiente_destino: false } : actual,
          )
          return
        }
        obtenerVotacion(viajeId, cambio.votacion_id, tokenSesion)
          .then((actualizada) => setVotacion((actual) => (actual?.id === actualizada.id ? actualizada : actual)))
          .catch((e) => setErrorVoto(mensajeDeError(e)))
      }),
    [viajeId, tokenSesion],
  )

  // Con el destino ya fijado (ahora o antes de entrar) se pasa al inicio del viaje
  const conDestino = viaje !== null && !viaje.pendiente_destino
  useEffect(() => {
    if (viaje && conDestino) onDestinoFijado?.(viaje)
  }, [viaje, conDestino, onDestinoFijado])

  const miembros = (viaje?.miembros ?? []).map((m, i) => aMiembro(m.nombre, i))
  const esCreador = viaje?.rol === "creador"

  const conVotos = conPorcentajes(votacion?.opciones ?? [])
  const ganadoras = opcionesGanadoras(conVotos)
  const hayEmpate = ganadoras.length > 1
  // RF9: el destino solo se fija cuando han votado todos los miembros
  const todosHanVotado = votacion?.todos_han_votado ?? false
  const puedeFijar = todosHanVotado && ganadoras.length > 0
  const miVoto = votacion?.mi_voto ?? null

  // Al tocar un destino se vota (o se cambia el voto) directamente
  const votarDestino = async (opcionId: string) => {
    if (!votacion || opcionId === miVoto) return
    setVotando(true)
    setErrorVoto("")
    try {
      setVotacion(await votar(viajeId, votacion.id, opcionId, tokenSesion))
    } catch (e) {
      setErrorVoto(mensajeDeError(e))
    } finally {
      setVotando(false)
    }
  }

  // Cerrar la votación fija el destino en el viaje; con empate, el backend elige uno al azar
  const fijarDestino = async () => {
    if (!viaje || !votacion || !puedeFijar) return
    setFijando(true)
    setErrorFijar("")
    try {
      const { destino } = await cerrarVotacion(viajeId, votacion.id, tokenSesion)
      setViaje({ ...viaje, destino, pendiente_destino: false })
    } catch (e) {
      setErrorFijar(mensajeDeError(e))
      setFijando(false)
    }
  }

  if (conDestino) return null

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
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
                  marginBottom: 6,
                }}
              >
                <Icon name="arrow_left" size={13} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
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
                  Mis Viajes
                </span>
              </button>
              {viaje && (
                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {viaje.nombre}
                </div>
              )}
              <Heading size={22} color="white">
                Elegir Destino
              </Heading>
            </div>
            {viaje && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingTop: 20 }}>
                <AvatarStack members={miembros} size={32} />
                <button
                  type="button"
                  onClick={onInvitar}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "none",
                    borderRadius: 8,
                    padding: "4px 11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 10,
                    fontFamily: NUNITO,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="plus" size={11} color="rgba(255,255,255,0.85)" strokeWidth={2.5} />
                  Invitar
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "20px 16px 28px" }}>
          {error && (
            <div
              role="alert"
              style={{
                background: C.redBg,
                border: `1.5px solid ${C.red}55`,
                borderRadius: 12,
                padding: "10px 14px",
                color: C.red,
                fontFamily: NUNITO,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              No se ha podido cargar el viaje: {error}
            </div>
          )}

          {viaje && (
            <>
              {/* Explicación */}
              <div
                style={{
                  background: C.lightBlue,
                  border: `1.5px solid ${C.blue}30`,
                  borderRadius: 16,
                  padding: "14px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Icon name="info" size={18} color={C.blue} strokeWidth={2} />
                <span style={{ fontFamily: NUNITO, fontSize: 13, color: C.blue, lineHeight: 1.5 }}>
                  Vota el destino del viaje. Cuando hayan votado todos los miembros, el creador podrá fijar el más votado
                  como destino oficial y se desbloqueará el resto de funciones.
                </span>
              </div>

              {/* Votación */}
              <section
                aria-label="Votación del destino"
                style={{
                  background: "white",
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  boxShadow: SHADOWS.cardRaised,
                  marginBottom: 16,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: NUNITO, color: C.navy, fontSize: 15, fontWeight: 800, marginTop: 10 }}>
                    ¿A dónde queremos ir?
                  </div>
                </div>

                {conVotos.length === 0 ? (
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                    Todavía no hay destinos propuestos. Propón el primero.
                  </div>
                ) : (
                  <div role="radiogroup" aria-label="Destinos propuestos">
                    {conVotos.map((opcion) => (
                      <OpcionVotacion
                        key={opcion.id}
                        texto={opcion.texto}
                        votos={opcion.votos}
                        porcentaje={opcion.porcentaje}
                        seleccionada={miVoto === opcion.id}
                        destacada={!hayEmpate && ganadoras[0]?.id === opcion.id}
                        nota={miVoto === opcion.id ? "Tu elección" : undefined}
                        deshabilitada={votando}
                        onSeleccionar={() => votarDestino(opcion.id)}
                      />
                    ))}
                  </div>
                )}

                {errorVoto && (
                  <div role="alert" style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                    {errorVoto}
                  </div>
                )}

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
                  <AvatarStack members={miembros} size={22} />
                  <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, flex: 1 }}>
                    <strong style={{ color: C.navy }}>
                      {votacion?.total_votos ?? 0}/{votacion?.total_miembros ?? miembros.length}
                    </strong>{" "}
                    miembros han votado
                  </span>
                </div>

                {/* Proponer destino */}
                {votacion && (
                  <ProponerOpcion
                    etiqueta="Proponer destino"
                    placeholder="Ej. Berlín, Estambul..."
                    existentes={votacion.opciones.map((o) => o.texto)}
                    avisoRepetida="Ese destino ya está propuesto"
                    onProponer={async (texto) => setVotacion(await proponerOpcion(viajeId, votacion.id, { texto }, tokenSesion))}
                  />
                )}
              </section>

              {/* Fijar destino: solo el creador */}
              {!esCreador && (
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>
                  El creador del viaje fijará el destino cuando hayan votado todos los miembros.
                </div>
              )}

              {esCreador && !confirmando && (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={!puedeFijar}
                  style={{
                    width: "100%",
                    background: GRADIENTS.success,
                    color: "white",
                    border: "none",
                    borderRadius: 16,
                    padding: "15px 20px",
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: puedeFijar ? "pointer" : "not-allowed",
                    opacity: puedeFijar ? 1 : 0.6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 6px 20px rgba(39,103,73,0.35)",
                  }}
                >
                  <Icon name="pin" size={18} color="white" strokeWidth={2} />
                  {ganadoras.length === 0 && "Fijar destino"}
                  {ganadoras.length === 1 && `Fijar «${ganadoras[0].texto}» como destino`}
                  {hayEmpate && "Fijar destino (hay empate)"}
                </button>
              )}

              {esCreador && !confirmando && !todosHanVotado && (
                <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 1.5, marginTop: 8 }}>
                  Podrás fijar el destino cuando hayan votado todos los miembros.
                </div>
              )}

              {esCreador && confirmando && (
                <div
                  role="dialog"
                  aria-label="Confirmar destino"
                  style={{
                    background: "white",
                    borderRadius: 20,
                    padding: 20,
                    border: `2px solid ${C.greenMid}`,
                    boxShadow: "0 4px 20px rgba(56,161,105,0.2)",
                  }}
                >
                  <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 15, marginBottom: 6 }}>
                    Confirmar destino
                  </div>
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                    {hayEmpate ? (
                      <>
                        Hay un empate entre{" "}
                        <strong style={{ color: C.green }}>{enumerar(ganadoras.map((g) => g.texto))}</strong>: se elegirá
                        uno de ellos al azar como destino oficial.
                      </>
                    ) : (
                      <>
                        Se fijará <strong style={{ color: C.green }}>{ganadoras[0]?.texto}</strong> como destino oficial.
                      </>
                    )}{" "}
                    Esto desbloqueará el itinerario, los gastos y el resto del viaje.
                  </div>
                  {errorFijar && (
                    <div role="alert" style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                      {errorFijar}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      disabled={fijando}
                      style={{
                        flex: 1,
                        background: C.bg,
                        color: C.muted,
                        border: `1.5px solid ${C.border}`,
                        borderRadius: 12,
                        padding: 12,
                        fontFamily: NUNITO,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={fijarDestino}
                      disabled={fijando}
                      style={{
                        flex: 2,
                        background: C.greenMid,
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        padding: 12,
                        fontFamily: NUNITO,
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: fijando ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="check" size={15} color="white" strokeWidth={2.5} />
                      {fijando && "Fijando destino..."}
                      {!fijando && (hayEmpate ? "Confirmar sorteo" : `Confirmar ${ganadoras[0]?.texto ?? ""}`)}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
