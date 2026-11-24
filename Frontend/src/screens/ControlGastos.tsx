import { useEffect, useState } from "react"
import CabeceraPantalla from "../components/CabeceraPantalla"
import Avatar from "../components/Avatar"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import Icon from "../components/Icon"
import IconoColor from "../components/IconoColor"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import {
  listarGastos,
  obtenerBalance,
  obtenerLiquidacion,
  marcarDeudaSaldada,
  deshacerDeudaSaldada,
  type DeudaSaldada,
  type Gasto,
  type SaldoMiembro,
  type Transferencia,
} from "../services/gastosApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { viajeEnCache } from "../services/viajesEnCache"
import { estiloAlerta } from "../styles/formulario"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import {
  conEuros,
  conSigno,
  estadoDelSaldo,
  fechaDelGasto,
  iconoDeCategoriaGasto,
  tamanoSegunLongitud,
} from "../utils/gastos"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const COLORES_SALDO = { green: C.green, accent: C.accent, muted: C.muted }

const nombreOAntiguo = (nombre: string | null) => nombre ?? "Un antiguo miembro"
const FONDOS_SALDO = { green: C.greenBg, accent: C.lightAccent, muted: C.bg }

// Pantalla: Control de Gastos 
type ControlGastosProps = {
  viajeId: string
  tokenSesion: string
  // Usuario de la sesión, para destacar su saldo
  usuarioId: string
  onVolver?: () => void
  onAnadirGasto?: () => void
  // Abre el detalle del gasto pulsado en el historial
  onAbrirGasto?: (gastoId: string) => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function ControlGastos({
  viajeId,
  tokenSesion,
  usuarioId,
  onVolver,
  onAnadirGasto,
  onAbrirGasto,
  onCambiarSeccion,
}: ControlGastosProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(() => viajeEnCache(viajeId))
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [total, setTotal] = useState(0)
  const [saldos, setSaldos] = useState<SaldoMiembro[]>([])
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [saldadas, setSaldadas] = useState<DeudaSaldada[]>([])
  // Clave de la deuda que se está marcando o deshaciendo, y el error de esa acción
  const [accionDeuda, setAccionDeuda] = useState("")
  const [errorDeuda, setErrorDeuda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  // El viaje hace falta para saber quién pagó cada gasto y si aún se pueden añadir
  useEffect(() => {
    let vigente = true
    Promise.all([
      obtenerViaje(viajeId, tokenSesion),
      listarGastos(viajeId, tokenSesion),
      obtenerBalance(viajeId, tokenSesion),
      obtenerLiquidacion(viajeId, tokenSesion),
    ])
      .then(([datosViaje, lista, balance, liquidacion]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setGastos(lista.gastos)
        setTotal(lista.total)
        setSaldos(balance.saldos)
        setTransferencias(liquidacion.transferencias)
        setSaldadas(liquidacion.saldadas)
      })
      .catch((e) => {
        if (vigente) setError(`No se han podido cargar los gastos: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  // Tras marcar o deshacer una deuda se vuelve a pedir el balance y la liquidación
  const recargarLiquidacion = async () => {
    const [balance, liquidacion] = await Promise.all([
      obtenerBalance(viajeId, tokenSesion),
      obtenerLiquidacion(viajeId, tokenSesion),
    ])
    setSaldos(balance.saldos)
    setTransferencias(liquidacion.transferencias)
    setSaldadas(liquidacion.saldadas)
  }

  // Marcar o deshacer una deuda: mientras se hace, su botón queda ocupado y el error se muestra en la liquidación
  const accionSobreDeuda = async (clave: string, accion: () => Promise<unknown>) => {
    setAccionDeuda(clave)
    setErrorDeuda("")
    try {
      await accion()
      await recargarLiquidacion()
    } catch (e) {
      setErrorDeuda(mensajeDeError(e))
    } finally {
      setAccionDeuda("")
    }
  }

  const miembros = viaje?.miembros ?? []
  // Nombre y color de quien pagó, con el mismo color que su avatar en el resto de pantallas
  const pagador = (usuarioId: string) => {
    const indice = miembros.findIndex((m) => m.usuario_id === usuarioId)
    return indice === -1 ? { name: "Un antiguo miembro", color: C.muted } : aMiembro(miembros[indice].nombre, indice, miembros[indice].avatar_url)
  }
  const activo = viaje?.estado === "activo"
  const miSaldo = saldos.find((s) => s.usuario_id === usuarioId)
  const estadoMio = miSaldo ? estadoDelSaldo(miSaldo.saldo) : null

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        {/* Cabecera */}
        <CabeceraPantalla
          titulo="Control de Gastos"
          contexto={viaje?.nombre}
          onVolver={onVolver}
          etiquetaVolver="Volver a Mis Viajes" textoVolver="Inicio"
        />

        <div style={{ padding: "20px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {cargando && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando gastos...</p>
          )}

          {viaje && (
            <>
              {/* Total gastado */}
              <section
                aria-label="Total gastado"
                style={{
                  background: "white",
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: SHADOWS.cardRaised,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: NUNITO,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Total gastado
                </div>
                {/* Con importes largos «Tu saldo» baja debajo del total en lugar de salirse por la derecha */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontFamily: NUNITO,
                      fontSize: tamanoSegunLongitud(conEuros(total).length, 34, 22, 10, 18),
                      fontWeight: 900,
                      color: C.navy,
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {conEuros(total)}
                  </div>

                  {/* Saldo de quien usa la app */}
                  {miSaldo && estadoMio && (
                    <div
                      role="group"
                      aria-label="Tu saldo"
                      style={{
                        background: FONDOS_SALDO[estadoMio.color],
                        border: `1.5px solid ${COLORES_SALDO[estadoMio.color]}55`,
                        borderRadius: RADIUS.md,
                        padding: "10px 14px",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: NUNITO,
                          fontSize: 10,
                          fontWeight: 700,
                          color: C.muted,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        Tu saldo
                      </div>
                      <div
                        style={{
                          fontFamily: NUNITO,
                          fontSize: 17,
                          fontWeight: 900,
                          color: COLORES_SALDO[estadoMio.color],
                          whiteSpace: "nowrap",
                        }}
                      >
                        {conSigno(miSaldo.saldo)}
                      </div>
                      <div
                        style={{
                          fontFamily: NUNITO,
                          fontSize: 10,
                          fontWeight: 800,
                          color: COLORES_SALDO[estadoMio.color],
                          textTransform: "uppercase",
                          marginTop: 2,
                        }}
                      >
                        {estadoMio.texto}
                      </div>
                    </div>
                  )}
                </div>

                {/* Saldo de cada miembro: positivo, le deben; negativo, debe */}
                {saldos.length > 0 && (
                  <ul
                    aria-label="Saldo de cada miembro"
                    style={{
                      listStyle: "none",
                      margin: "16px 0 0",
                      padding: "12px 8px",
                      background: C.bg,
                      borderRadius: RADIUS.md,
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-around",
                      gap: 8,
                    }}
                  >
                    {saldos.map((s) => {
                      const indice = miembros.findIndex((m) => m.usuario_id === s.usuario_id)
                      const miembro =
                        indice === -1 ? { name: "Antiguo miembro", initial: "?", color: C.muted } : aMiembro(s.nombre, indice, miembros[indice].avatar_url)
                      const estado = estadoDelSaldo(s.saldo)
                      return (
                        <li
                          key={s.usuario_id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            minWidth: 72,
                            maxWidth: "100%",
                          }}
                        >
                          <span aria-hidden="true">
                            <Avatar member={miembro} size={30} showBorder={false} />
                          </span>
                          <span style={{ fontFamily: NUNITO, fontSize: 11, fontWeight: 700, color: C.navy }}>{miembro.name}</span>
                          <span
                            style={{
                              fontFamily: NUNITO,
                              fontSize: 12,
                              fontWeight: 800,
                              color: COLORES_SALDO[estado.color],
                              whiteSpace: "nowrap",
                            }}
                          >
                            {conSigno(s.saldo)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {/* Transferencias para saldar las cuentas: las tuyas salen destacadas */}
              <section
                aria-label="Liquidación"
                style={{
                  background: "white",
                  borderRadius: RADIUS.xl,
                  padding: 20,
                  marginBottom: 16,
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <SectionLabel>Liquidación</SectionLabel>
                {errorDeuda && (
                  <div role="alert" style={{ ...estiloAlerta, marginBottom: 12 }}>
                    {errorDeuda}
                  </div>
                )}
                {transferencias.length === 0 ? (
                  <p style={{ fontFamily: NUNITO, color: C.green, fontSize: 13, fontWeight: 700, margin: 0 }}>
                    Cuentas saldadas
                  </p>
                ) : (
                  <ul
                    aria-label="Transferencias pendientes"
                    style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {transferencias.map((t) => {
                      const pagas = t.de === usuarioId
                      const tePagan = t.a === usuarioId
                      const texto = pagas
                        ? `Tú pagas a ${nombreOAntiguo(t.a_nombre)}`
                        : tePagan
                          ? `${nombreOAntiguo(t.de_nombre)} te paga a ti`
                          : `${nombreOAntiguo(t.de_nombre)} paga a ${nombreOAntiguo(t.a_nombre)}`
                      const destacada = pagas || tePagan
                      return (
                        <li
                          key={`${t.de}-${t.a}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "10px 12px",
                            borderRadius: RADIUS.md,
                            background: pagas ? C.lightAccent : tePagan ? C.greenBg : C.bg,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: NUNITO,
                              fontSize: 13,
                              fontWeight: destacada ? 800 : 600,
                              color: pagas ? C.accent : tePagan ? C.green : C.navy,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            {texto}
                          </span>
                          <span style={{ fontFamily: NUNITO, fontSize: 13, fontWeight: 900, color: C.navy, whiteSpace: "nowrap" }}>
                            {conEuros(t.importe)}
                          </span>
                          {tePagan && activo && (
                            <button
                              type="button"
                              aria-label={`Marcar como saldada la deuda de ${nombreOAntiguo(t.de_nombre)}`}
                              disabled={accionDeuda !== ""}
                              onClick={() => accionSobreDeuda(`${t.de}-${t.a}`, () => marcarDeudaSaldada(viajeId, t.de, t.importe, tokenSesion))}
                              style={{
                                background: C.green,
                                color: "white",
                                border: "none",
                                borderRadius: RADIUS.md,
                                padding: "7px 10px",
                                fontFamily: NUNITO,
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: accionDeuda !== "" ? "wait" : "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {accionDeuda === `${t.de}-${t.a}` ? "Guardando..." : "Saldar"}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {/* Deudas ya saldadas: quien recibe el dinero puede deshacer la marca */}
              {saldadas.length > 0 && (
                <section
                  aria-label="Deudas saldadas"
                  style={{
                    background: "white",
                    borderRadius: RADIUS.xl,
                    padding: 20,
                    marginBottom: 16,
                    boxShadow: SHADOWS.card,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  <SectionLabel>Saldadas</SectionLabel>
                  <ul
                    aria-label="Deudas marcadas como saldadas"
                    style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {saldadas.map((d) => {
                      const clave = `${d.de}-${d.a}-saldada`
                      return (
                        <li
                          key={clave}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "10px 12px",
                            borderRadius: RADIUS.md,
                            background: C.bg,
                          }}
                        >
                          <span style={{ fontFamily: NUNITO, fontSize: 13, fontWeight: 600, color: C.navy, minWidth: 0 }}>
                            {`${nombreOAntiguo(d.de_nombre)} pagó ${conEuros(d.importe)} a ${nombreOAntiguo(d.a_nombre)}`}
                          </span>
                          {d.a === usuarioId && activo && (
                            <button
                              type="button"
                              aria-label={`Deshacer la marca de saldada de la deuda de ${nombreOAntiguo(d.de_nombre)}`}
                              disabled={accionDeuda !== ""}
                              onClick={() => accionSobreDeuda(clave, () => deshacerDeudaSaldada(viajeId, d.de, tokenSesion))}
                              style={{
                                background: "white",
                                color: C.red,
                                border: `1.5px solid ${C.red}55`,
                                borderRadius: RADIUS.md,
                                padding: "7px 10px",
                                fontFamily: NUNITO,
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: accionDeuda !== "" ? "wait" : "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {accionDeuda === clave ? "Deshaciendo..." : "Deshacer"}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {/* Solo se añaden gastos mientras el viaje está activo */}
              {activo ? (
                <button
                  type="button"
                  onClick={onAnadirGasto}
                  style={{
                    width: "100%",
                    background: C.blue,
                    color: "white",
                    border: "none",
                    borderRadius: RADIUS.md,
                    padding: 13,
                    fontFamily: NUNITO,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    boxShadow: SHADOWS.button,
                    marginBottom: 20,
                  }}
                >
                  <Icon name="plus" size={16} color="white" strokeWidth={2.5} />
                  Añadir Gasto
                </button>
              ) : null}

              <SectionLabel>Historial de gastos</SectionLabel>
              {gastos.length === 0 ? (
                <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  Todavía no hay gastos en este viaje.
                </p>
              ) : (
                <ul
                  aria-label="Historial de gastos"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    background: "white",
                    borderRadius: RADIUS.lg,
                    overflow: "hidden",
                    boxShadow: SHADOWS.card,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  {gastos.map((gasto, i) => {
                    const quien = pagador(gasto.pagado_por)
                    return (
                      <li
                        key={gasto.id}
                        style={{ borderBottom: i < gastos.length - 1 ? `1px solid ${C.border}` : "none" }}
                      >
                        {/* Toda la fila abre el detalle del gasto */}
                        <button
                          type="button"
                          onClick={() => onAbrirGasto?.(gasto.id)}
                          aria-label={`Ver el detalle de ${gasto.concepto}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                            padding: "13px 16px",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 13,
                              background: C.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <IconoColor name={iconoDeCategoriaGasto(gasto.categoria)} size={24} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: NUNITO,
                                color: C.navy,
                                fontSize: 13,
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {gasto.concepto}
                            </div>
                            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 11, marginTop: 2 }}>
                              Pagó <span style={{ color: quien.color, fontWeight: 700 }}>{quien.name}</span> ·{" "}
                              {fechaDelGasto(gasto.fecha)}
                            </div>
                          </div>
                          <div
                            style={{
                              fontFamily: NUNITO,
                              color: C.navy,
                              fontSize: tamanoSegunLongitud(conEuros(gasto.importe).length, 15, 13, 12, 18),
                              fontWeight: 900,
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {conEuros(gasto.importe)}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <BarraInferior activa="gastos" onCambiar={onCambiarSeccion} />
    </div>
  )
}
