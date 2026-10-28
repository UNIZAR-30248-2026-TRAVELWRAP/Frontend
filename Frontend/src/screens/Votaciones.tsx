import { useEffect, useState } from "react"
import AvatarStack from "../components/AvatarStack"
import Badge from "../components/Badge"
import DialogoConfirmacion from "../components/DialogoConfirmacion"
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
  type TipoVotacion,
  type Votacion,
} from "../services/votacionesApi"
import { escucharVotaciones } from "../services/votacionesTiempoReal"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { conPorcentajes, enumerar, opcionesGanadoras } from "../utils/votaciones"
import BotonVolver from "../components/BotonVolver"

const FILTROS: { texto: string; tipo: TipoVotacion | null }[] = [
  { texto: "Todas", tipo: null },
  { texto: "Fechas", tipo: "fecha" },
  { texto: "Actividades", tipo: "actividad" },
]

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Usuarios que han votado en la votación
const votantesDe = (votacion: Votacion) => new Set(votacion.opciones.flatMap((o) => o.votantes))

// ─── Pantalla: Votaciones ─────────────────────────────────────────────────────
type VotacionesProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onCrearVotacion?: () => void
}

export default function Votaciones({ viajeId, tokenSesion, onVolver, onCrearVotacion }: VotacionesProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [votaciones, setVotaciones] = useState<Votacion[] | null>(null)
  const [error, setError] = useState("")
  const [filtro, setFiltro] = useState<TipoVotacion | null>(null)
  // Opción marcada en cada votación (si no se ha marcado ninguna, la que ya votó el usuario)
  const [seleccion, setSeleccion] = useState<Record<string, string>>({})
  const [votando, setVotando] = useState<string | null>(null)
  const [erroresVoto, setErroresVoto] = useState<Record<string, string>>({})
  // Votación que el creador está a punto de cerrar
  const [porCerrar, setPorCerrar] = useState<Votacion | null>(null)
  const [cerrando, setCerrando] = useState(false)
  const [errorCierre, setErrorCierre] = useState("")

  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarVotaciones(viajeId, tokenSesion)])
      .then(([datosViaje, { votaciones: lista }]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setVotaciones(lista)
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e))
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Tiempo real: cuando cambia una votación (votos, opciones, cierre) se vuelve a pedir solo esa; si es nueva,
  // la lista entera. El aviso no trae los datos para que cada uno reciba su propio «mi_voto»
  useEffect(
    () =>
      escucharVotaciones(viajeId, tokenSesion, (cambio) => {
        const pedida =
          cambio.motivo === "creada"
            ? listarVotaciones(viajeId, tokenSesion).then(({ votaciones: lista }) => setVotaciones(lista))
            : obtenerVotacion(viajeId, cambio.votacion_id, tokenSesion).then((actualizada) =>
                setVotaciones((lista) => {
                  if (lista === null) return lista
                  return lista.some((v) => v.id === actualizada.id)
                    ? lista.map((v) => (v.id === actualizada.id ? actualizada : v))
                    : [actualizada, ...lista]
                }),
              )
        pedida.catch((e) => setError(mensajeDeError(e)))
      }),
    [viajeId, tokenSesion],
  )

  const reemplazar = (actualizada: Votacion) =>
    setVotaciones((lista) => (lista ?? []).map((v) => (v.id === actualizada.id ? actualizada : v)))

  // Avatares con el mismo color que en el resto del viaje (según la posición del miembro)
  const avataresDe = (votacion: Votacion) => {
    const votantes = votantesDe(votacion)
    return (viaje?.miembros ?? [])
      .map((m, i) => ({ miembro: m, avatar: aMiembro(m.nombre, i) }))
      .filter(({ miembro }) => votantes.has(miembro.usuario_id))
      .map(({ avatar }) => avatar)
  }

  const editable = viaje?.estado === "activo"
  const esCreador = viaje?.rol === "creador"

  const visibles = (votaciones ?? []).filter((v) => filtro === null || v.tipo === filtro)
  const abiertas = visibles.filter((v) => v.estado === "abierta")
  const cerradas = visibles.filter((v) => v.estado === "cerrada")

  const emitirVoto = async (votacion: Votacion, opcionId: string) => {
    setVotando(votacion.id)
    setErroresVoto((errores) => ({ ...errores, [votacion.id]: "" }))
    try {
      reemplazar(await votar(viajeId, votacion.id, opcionId, tokenSesion))
    } catch (e) {
      setErroresVoto((errores) => ({ ...errores, [votacion.id]: mensajeDeError(e) }))
    } finally {
      setVotando(null)
    }
  }

  // Al cerrar gana la opción más votada; si hay empate, el backend elige una al azar
  const confirmarCierre = async () => {
    if (!porCerrar) return
    setCerrando(true)
    setErrorCierre("")
    try {
      const { votacion } = await cerrarVotacion(viajeId, porCerrar.id, tokenSesion)
      reemplazar(votacion)
      setPorCerrar(null)
    } catch (e) {
      setErrorCierre(mensajeDeError(e))
    } finally {
      setCerrando(false)
    }
  }

  const ganadorasPorCerrar = porCerrar ? opcionesGanadoras(porCerrar.opciones) : []

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera con filtros */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 22px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <BotonVolver onClick={onVolver} />
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
              No se han podido cargar las votaciones: {error}
            </div>
          )}

          {editable && (
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
          )}

          {votaciones && visibles.length === 0 && (
            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              {filtro === null ? "Todavía no hay votaciones en este viaje." : "No hay votaciones de este tipo todavía."}
            </div>
          )}

          {/* Votaciones abiertas */}
          {abiertas.map((votacion) => {
            const opciones = conPorcentajes(votacion.opciones)
            const marcada = seleccion[votacion.id] ?? votacion.mi_voto ?? undefined
            const yaVotado = marcada !== undefined && marcada === votacion.mi_voto
            const enviando = votando === votacion.id
            const errorVoto = erroresVoto[votacion.id]
            return (
              <section
                key={votacion.id}
                aria-label={votacion.titulo}
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
                  <Heading size={15}>{votacion.titulo}</Heading>
                  {votacion.descripcion && (
                    <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                      {votacion.descripcion}
                    </div>
                  )}
                </div>

                {opciones.length === 0 && (
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                    Todavía no hay opciones. Propón la primera.
                  </div>
                )}

                <div role="radiogroup" aria-label="Opciones">
                  {opciones.map((opcion) => (
                    <OpcionVotacion
                      key={opcion.id}
                      texto={opcion.texto}
                      votos={opcion.votos}
                      porcentaje={opcion.porcentaje}
                      seleccionada={marcada === opcion.id}
                      nota={votacion.mi_voto === opcion.id ? "Tu elección" : undefined}
                      deshabilitada={!editable || enviando}
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
                  <AvatarStack members={avataresDe(votacion)} size={22} />
                  <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, flex: 1 }}>
                    <strong style={{ color: C.navy }}>
                      {votacion.total_votos}/{votacion.total_miembros}
                    </strong>{" "}
                    miembros han votado
                  </span>
                  {votacion.todos_han_votado && (
                    <Badge bg={C.greenBg} color={C.green}>
                      Completo
                    </Badge>
                  )}
                </div>

                {errorVoto && (
                  <div role="alert" style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                    {errorVoto}
                  </div>
                )}

                {editable && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => marcada && emitirVoto(votacion, marcada)}
                      disabled={!marcada || yaVotado || enviando}
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
                        cursor: !marcada || yaVotado || enviando ? "default" : "pointer",
                        opacity: marcada ? 1 : 0.6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxShadow: SHADOWS.button,
                      }}
                    >
                      {enviando && "Enviando voto..."}
                      {!enviando && yaVotado && (
                        <>
                          <Icon name="check" size={15} color="white" strokeWidth={2.5} />
                          Voto emitido
                        </>
                      )}
                      {!enviando && !yaVotado && (votacion.mi_voto ? "Cambiar voto" : "Emitir voto")}
                    </button>
                    {esCreador && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorCierre("")
                          setPorCerrar(votacion)
                        }}
                        disabled={!votacion.todos_han_votado}
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
                          cursor: votacion.todos_han_votado ? "pointer" : "not-allowed",
                          opacity: votacion.todos_han_votado ? 1 : 0.5,
                        }}
                      >
                        Cerrar votación
                      </button>
                    )}
                  </div>
                )}

                {/* RF9: solo se cierra cuando han votado todos los miembros */}
                {editable && esCreador && !votacion.todos_han_votado && (
                  <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 10, textAlign: "center" }}>
                    Podrás cerrarla cuando hayan votado todos los miembros.
                  </div>
                )}

                {/* Cualquier miembro propone opciones mientras la votación está abierta */}
                {editable && (
                  <div style={{ marginTop: 14 }}>
                    <ProponerOpcion
                      etiqueta="Proponer opción"
                      placeholder="Ej. Otro fin de semana, otra actividad..."
                      existentes={votacion.opciones.map((o) => o.texto)}
                      avisoRepetida="Esa opción ya está propuesta"
                      onProponer={async (texto) => reemplazar(await proponerOpcion(viajeId, votacion.id, { texto }, tokenSesion))}
                    />
                  </div>
                )}
              </section>
            )
          })}

          {/* Votaciones cerradas */}
          {cerradas.map((votacion) => {
            const opciones = conPorcentajes(votacion.opciones)
            const ganadora = opciones.find((o) => o.id === votacion.opcion_ganadora_id)
            return (
              <section
                key={votacion.id}
                aria-label={votacion.titulo}
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
                  <Heading size={13}>{votacion.titulo}</Heading>
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

      {porCerrar && (
        <DialogoConfirmacion
          titulo="¿Cerrar la votación?"
          icono="vote"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Cerrar votación"
          textoConfirmando="Cerrando..."
          ocupado={cerrando}
          error={errorCierre}
          onConfirmar={confirmarCierre}
          onCancelar={() => setPorCerrar(null)}
        >
          {ganadorasPorCerrar.length === 1 && (
            <>
              Ganará <strong style={{ color: C.navy }}>{ganadorasPorCerrar[0].texto}</strong>, la opción más votada.
            </>
          )}
          {ganadorasPorCerrar.length > 1 && (
            <>
              Hay un empate entre <strong style={{ color: C.navy }}>{enumerar(ganadorasPorCerrar.map((g) => g.texto))}</strong>:
              se elegirá una de ellas al azar.
            </>
          )}{" "}
          Después ya no se podrá votar.
        </DialogoConfirmacion>
      )}
    </div>
  )
}
